import { Injectable, BadRequestException, NotFoundException } from "@nestjs/common";
import { DataSource, Repository } from "typeorm";
import { CreateTournamentDto } from "../dto/create-tournament.dto";
import { TournamentPhase } from "../entities/tournament-phase.entity";
import { Tournament, TournamentStatus } from "../entities/tournament.entity";
import { InjectRepository } from "@nestjs/typeorm";

@Injectable()
export class CreateTournamentCommand {
    constructor(
        @InjectRepository(Tournament) private tournamentRepo: Repository<Tournament>,
        @InjectRepository(TournamentPhase) private phaseRepo: Repository<TournamentPhase>,
        private dataSource: DataSource,
    ) {}

    async execute(dto: CreateTournamentDto): Promise<Tournament> {
        this.validatePhaseChain(dto.phases);

        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            // 1. Create the Tournament instance
            const tournament = queryRunner.manager.create(Tournament, {
                name: dto.name,
                max_participants: dto.max_participants,
                description: dto.description,
                current_phase_order: 1, 
                status: TournamentStatus.REGISTRATION_OPEN // Aligned with Tournament Entity default
            });
            const savedTournament = await queryRunner.manager.save(tournament);

            // 2. Create Phases
            if (dto.phases && dto.phases.length > 0) {
                const phasesToCreate = dto.phases.map((phaseDto) => 
                    queryRunner.manager.create(TournamentPhase, {
                        ...phaseDto,
                        tournament_id: savedTournament.id // Link via ID
                    })
                );
                const savedPhases = await queryRunner.manager.save(phasesToCreate);
                
                // 3. Update the Active Phase Pointer immediately
                const firstPhase = savedPhases.find(p => p.order === 1);
                if (firstPhase) {
                    savedTournament.active_phase_id = firstPhase.id;
                    await queryRunner.manager.save(savedTournament);
                }
            }

            await queryRunner.commitTransaction();
            
            // 4. Reload to return the full entity with relations
            const tournament_return = await this.tournamentRepo.findOne({
                where: { id: savedTournament.id },
                relations: ['phases', 'phases.game']
            });

            if (!tournament_return) {
                throw new NotFoundException(`Could not reload tournament ${savedTournament.id}`);
            }

            return tournament_return;

        } catch (err) {
            await queryRunner.rollbackTransaction();
            throw err;
        } finally {
            await queryRunner.release();
        }
    }

    private validatePhaseChain(phases: any[]) {
        if (!phases || phases.length === 0) return;

        const sorted = [...phases].sort((a, b) => a.order - b.order);

        if (sorted[0].order !== 1) {
            throw new BadRequestException("Phases must start at order 1.");
        }

        for (let i = 0; i < sorted.length; i++) {
            const phase = sorted[i];

            if (phase.type === 'SWISS' && !phase.swiss_rounds) {
                throw new BadRequestException(`Phase ${phase.order} (SWISS) requires swiss_rounds.`);
            }
            if (phase.type === 'GROUP_STAGE') {
                if (!phase.group_size || !phase.group_winners_count) {
                    throw new BadRequestException(`Phase ${phase.order} (GROUP_STAGE) requires group_size and group_winners_count.`);
                }
            }

            if (i < sorted.length - 1) {
                const next = sorted[i + 1];
                if (phase.teams_limit_end !== next.teams_limit_start) {
                    throw new BadRequestException(
                        `Phase mismatch: Phase ${phase.order} outputs ${phase.teams_limit_end} teams, but Phase ${next.order} requires ${next.teams_limit_start} to start.`
                    );
                }
            }
        }
    }
}