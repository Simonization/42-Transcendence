import { DataSource, Repository } from "typeorm";
import { CreateTournamentDto } from "../dto/create-tournament.dto";
import { TournamentPhase } from "../entities/tournament-phase.entity";
import { Tournament } from "../entities/tournament.entity";
import { InjectRepository } from "@nestjs/typeorm";
import { Injectable } from "@nestjs/common";

@Injectable()
export class CreateTournamentCommand {
    constructor(
        @InjectRepository(Tournament) private tournamentRepo: Repository<Tournament>,
        @InjectRepository(TournamentPhase) private phaseRepo: Repository<TournamentPhase>,
        private dataSource: DataSource,
    ) {}

    async execute(dto: CreateTournamentDto): Promise<Tournament> {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            // 1. Create the Tournament
            const tournament = this.tournamentRepo.create({
                name: dto.name,
                max_participants: dto.max_participants,
                description: dto.description,
            });
            const savedTournament = await queryRunner.manager.save(tournament);

            // 2. Create the Phases
            if (dto.phases && dto.phases.length > 0) {
                const phases = dto.phases.map((phaseDto) => 
                    this.phaseRepo.create({
                        ...phaseDto,
                        tournament: savedTournament,
                    })
                );
                await queryRunner.manager.save(phases);
            }

            await queryRunner.commitTransaction();
            return savedTournament;
        } catch (err) {
            await queryRunner.rollbackTransaction();
            throw err;
        } finally {
            await queryRunner.release();
        }
    }
}