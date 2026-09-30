import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { DataSource, In } from "typeorm";
import { Tournament, TournamentStatus } from "../entities/tournament.entity";
import { Team, TeamStatus } from "../../teams/entities/team.entity";
import { NotificationsService } from "../../notifications/notifications.service";
import { NotificationDestination } from "../../notifications/entities/notification.entity";
import { BracketEngine, newEvents } from "../services/bracket-engine.service";
import { MatchNotifier } from "../services/match-notifier.service";
import { BracketPublisher } from "../services/bracket-publisher.service";
import { orderEntrants } from "../services/seeding";
import { checkinRequired } from "../services/registration-window";

@Injectable()
export class StartTournamentCommand {
    private readonly logger = new Logger(StartTournamentCommand.name);

    constructor(
        private dataSource: DataSource,
        private engine: BracketEngine,
        private notificationsService: NotificationsService,
        private notifier: MatchNotifier,
        private publisher: BracketPublisher,
    ) {}

    /**
     * Freezes the field and generates phase 1. Only LOCKED teams enter, in the seeding order
     * GET /tournaments/:id/seeding shows; DRAFT teams are archived; byes advance immediately.
     * When check-in has opened, only checked-in LOCKED teams enter and the others are archived.
     */
    async execute(tournamentId: number) {
        const events = newEvents();

        const { tournament, entrants } = await this.dataSource.transaction(async (manager) => {
            // Lock the row first (FOR UPDATE cannot sit on an outer join), so two concurrent
            // starts cannot both generate a bracket.
            const locked = await manager.findOne(Tournament, {
                where: { id: tournamentId },
                lock: { mode: 'pessimistic_write' },
            });
            if (!locked) throw new NotFoundException(`Tournament ${tournamentId} not found`);
            const tournament = (await manager.findOne(Tournament, {
                where: { id: tournamentId },
                relations: ['teams', 'phases'],
            }))!;
            if (tournament.status !== TournamentStatus.REGISTRATION_OPEN) {
                throw new BadRequestException('Tournament is not in registration phase.');
            }

            const phase1 = tournament.phases?.find(p => p.order === 1);
            if (!phase1) throw new BadRequestException('Phase 1 is missing.');

            const requireCheckin = checkinRequired(tournament);
            const entrants = orderEntrants(tournament.teams ?? [], tournament.seed_order, requireCheckin);
            if (entrants.length < 2) {
                throw new BadRequestException(`At least 2 locked teams are needed to start (found ${entrants.length}).`);
            }
            if (tournament.max_participants && entrants.length > tournament.max_participants) {
                throw new BadRequestException(
                    `${entrants.length} locked teams exceed the maximum of ${tournament.max_participants}.`,
                );
            }

            // Teams still recruiting (or locked but never checked in) are out; archive them rather
            // than leave them in limbo.
            const entered = new Set(entrants.map(t => t.id));
            const outIds = (tournament.teams ?? [])
                .filter(t => t.status === TeamStatus.DRAFT || (t.status === TeamStatus.LOCKED && !entered.has(t.id)))
                .map(t => t.id);
            if (outIds.length) {
                await manager.update(Team, { id: In(outIds) }, { status: TeamStatus.ARCHIVED });
            }

            tournament.status = TournamentStatus.ONGOING;
            tournament.active_phase_id = phase1.id;
            tournament.current_phase_order = 1;
            tournament.seed_order = entrants.map(t => t.id);
            await manager.update(Tournament, tournament.id, {
                status: tournament.status,
                active_phase_id: tournament.active_phase_id,
                current_phase_order: 1,
                seed_order: tournament.seed_order,
            });

            await this.engine.startPhase(manager, tournament.id, phase1, entrants, events);
            return { tournament, entrants };
        });

        this.notifyTournamentStart(tournament, entrants).catch(err =>
            this.logger.error(`Failed to send tournament start notifications: ${err?.message ?? err}`),
        );
        this.notifier.dispatch(this.notifier.matchesReady(events.readyMatchIds));
        void this.publisher.tournamentChanged(tournamentId, 'tournament_started', events);

        const { teams, phases, ...rest } = tournament;
        return rest;
    }

    private async notifyTournamentStart(tournament: Tournament, entrants: Team[]): Promise<void> {
        const teamsWithMembers = await this.dataSource.getRepository(Team).find({
            where: { id: In(entrants.map(t => t.id)) },
            relations: ['members'],
        });

        for (const team of teamsWithMembers) {
            for (const member of team.members ?? []) {
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
                        NotificationDestination.CHAT,
                    );
                } catch (notifError) {
                    this.logger.warn(`Failed to notify user ${member.id} about tournament start`);
                }
            }
        }
    }
}
