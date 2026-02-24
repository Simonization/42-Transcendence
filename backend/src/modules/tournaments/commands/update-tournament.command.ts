import { Injectable, NotFoundException } from "@nestjs/common";
import { TournamentPhase } from "../entities/tournament-phase.entity";
import { Tournament } from "../entities/tournament.entity";
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

            // 1. Update main fields
            const { phases, ...tournamentData } = dto;
            Object.assign(tournament, tournamentData);
            await queryRunner.manager.save(tournament);

            // 2. If phases are provided, replace the old ones
            if (phases) {
               // Delete old phases
               await queryRunner.manager.delete(TournamentPhase, { tournament_id: id });
               
               // Create new phases
               const newPhases = phases.map(p => this.phaseRepo.create({
                   ...p,
                   tournament: tournament
               }));
               await queryRunner.manager.save(newPhases);
            }

            await queryRunner.commitTransaction();
            const updatedTournament = await this.tournamentRepo.findOne({ 
               where: { id }, 
               relations: ['phases'] 
            });

            if (!updatedTournament) {
               throw new NotFoundException('Tournament was not found after update');
            }

            return updatedTournament;
        } catch (err) {
            await queryRunner.rollbackTransaction();
            throw err;
        } finally {
            await queryRunner.release();
        }
    }
}