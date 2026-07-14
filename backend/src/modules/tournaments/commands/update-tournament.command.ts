import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { TournamentPhase } from "../entities/tournament-phase.entity";
import { Tournament, TournamentStatus } from "../entities/tournament.entity";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, Repository } from "typeorm";
import { UpdateTournamentDto } from "../dto/update-tournament.dto";

@Injectable()
export class UpdateTournamentCommand {
    constructor(
        @InjectRepository(Tournament) private tournamentRepo: Repository<Tournament>,
        @InjectRepository(TournamentPhase) private phaseRepo: Repository<TournamentPhase>,
        private dataSource: DataSource,
    ) {}

    async execute(id: number, dto: UpdateTournamentDto): Promise<Tournament> {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            const tournament = await queryRunner.manager.findOne(Tournament, {
                where: { id },
                relations: ['phases']
            });

            if (!tournament) throw new NotFoundException('Tournament not found');

            // 1. Safety Check: Don't allow phase replacement if tournament is live
            if (dto.phases && tournament.status !== TournamentStatus.REGISTRATION_OPEN && tournament.status !== TournamentStatus.DRAFT) {
                throw new BadRequestException('Cannot modify phases once the tournament has started.');
            }

            // 2. Update main fields
            const { phases, scheduled_at, ...tournamentData } = dto;
            // Only assign fields that are explicitly defined (exclude undefined to avoid overwriting with null)
            const definedFields = Object.fromEntries(
                Object.entries(tournamentData).filter(([, v]) => v !== undefined)
            );
            Object.assign(tournament, definedFields);
            // scheduled_at (snake_case DTO) → scheduledAt (camelCase entity)
            if (scheduled_at !== undefined) {
                tournament.scheduledAt = scheduled_at ? new Date(scheduled_at) : null;
            }
            await queryRunner.manager.save(tournament);

            // 3. Handle Phases
            if (phases) {
                // Better approach: Delete old phases ONLY if tournament isn't live
                await queryRunner.manager.delete(TournamentPhase, { tournament_id: id });
                
                const newPhases = phases.map(p => queryRunner.manager.create(TournamentPhase, {
                    ...p,
                    tournament_id: id
                }));
                const savedPhases = await queryRunner.manager.save(newPhases);

                // Update pointer if order 1 changed
                const firstPhase = savedPhases.find(p => p.order === 1);
                if (firstPhase) {
                    tournament.active_phase_id = firstPhase.id;
                    await queryRunner.manager.save(tournament);
                }
            }

            await queryRunner.commitTransaction();

            return await this.tournamentRepo.findOne({ 
               where: { id }, 
               relations: ['phases', 'phases.game'] 
            }) as Tournament;

        } catch (err) {
            await queryRunner.rollbackTransaction();
            throw err;
        } finally {
            await queryRunner.release();
        }
    }
}