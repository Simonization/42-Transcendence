import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { DataSource, In } from "typeorm";
import { Tournament, TournamentStatus } from "../entities/tournament.entity";
import { BracketGeneratorService } from "../services/bracket-generator.service";
import { Match } from "src/modules/matches/entities/match.entity";
import { Team, TeamStatus } from "src/modules/teams/entities/team.entity";
import { NotificationsService } from "src/modules/notifications";
import { NotificationDestination } from "src/modules/notifications/entities/notification.entity";

@Injectable()
export class StartTournamentCommand {
  constructor(
    private dataSource: DataSource,
    private bracketGenerator: BracketGeneratorService,
    private notificationsService: NotificationsService,
  ) {}

    async execute(tournamentId: number) {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            const tournament = await queryRunner.manager.findOne(Tournament, {
                where: { id: tournamentId },
                relations: ['teams', 'phases'],
            });

            if (!tournament) throw new NotFoundException(`Tournament ${tournamentId} not found`);
            if (tournament.status !== TournamentStatus.REGISTRATION_OPEN) {
                throw new BadRequestException('Tournament is not in registration phase.');
            }

            const phase1 = tournament.phases?.find(p => p.order === 1);
            if (!phase1) throw new BadRequestException('Phase 1 is missing.');

            const readyTeams = tournament.teams.filter(t => t.status === TeamStatus.LOCKED);
            const minTeams = phase1.teams_limit_start || 2;

            if (readyTeams.length < minTeams) {
                throw new BadRequestException(`Insufficient teams. Required: ${minTeams}, Found: ${readyTeams.length}`);
            }

            // --- Updated State Logic ---
            tournament.status = TournamentStatus.ONGOING;
            tournament.active_phase_id = phase1.id;
            tournament.current_phase_order = 1;
            await queryRunner.manager.save(tournament);

            // --- Updated Generator Call ---
            // We pass the full phase1 entity instead of just phase1.type
            const result = await this.bracketGenerator.generate(
                queryRunner, 
                phase1, 
                readyTeams
            );

            // If the generator returns blueprints (like Round Robin usually does)
            if (Array.isArray(result) && result.length > 0) {
                const matchEntities = result.map(m => queryRunner.manager.create(Match, m));
                await queryRunner.manager.save(Match, matchEntities);
            }

            await queryRunner.commitTransaction();

            // Send notifications to all team members about tournament start (async, don't block)
            this.notifyTournamentStart(tournament, readyTeams).catch(err =>
                console.error('Failed to send tournament start notifications:', err)
            );

            return tournament;
        } catch (err) {
            await queryRunner.rollbackTransaction();
            throw err;
        } finally {
            await queryRunner.release();
        }
    }

    private async notifyTournamentStart(
        tournament: Tournament,
        readyTeams: any[]
    ): Promise<void> {
        const dataSource = this.dataSource;

        const teamsWithMembers = await dataSource.getRepository(Team).find({
            where: { id: In(readyTeams.map(t => t.id)) },
            relations: ['members'],
        });

        for (const team of teamsWithMembers) {
            if (team.members && Array.isArray(team.members)) {
                for (const member of team.members) {
                    try {
                        await this.notificationsService.sendNotification(
                            member.id,
                            'tournament_started',
                            `Tournament "${tournament.name}" has started! Good luck!`,
                            undefined,
                            {
                                tournamentId: tournament.id,
                                tournamentName: tournament.name,
                                teamId: team.id,
                                teamName: team.name,
                            },
                            NotificationDestination.CHAT
                        );
                    } catch (notifError) {
                        console.error(`Failed to notify user ${member.id} about tournament start:`, notifError);
                    }
                }
            }
        }
    }
}