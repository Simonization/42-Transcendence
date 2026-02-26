import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { DataSource } from "typeorm";
import { Tournament, TournamentStatus } from "../entities/tournament.entity";
import { BracketGeneratorService } from "../services/bracket-generator.service";
import { Match } from "src/modules/matches/entities/match.entity";
import { TeamStatus } from "src/modules/teams/entities/team.entity";

@Injectable()
export class StartTournamentCommand {
    constructor(
        private dataSource: DataSource,
        private bracketGenerator: BracketGeneratorService,
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
            return tournament;
        } catch (err) {
            await queryRunner.rollbackTransaction();
            throw err;
        } finally {
            await queryRunner.release();
        }
    }
}