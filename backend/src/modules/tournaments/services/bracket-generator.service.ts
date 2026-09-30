import { BadRequestException, Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Match } from '../../matches/entities/match.entity';
import { Team } from '../../teams/entities/team.entity';
import { SingleEliminationGenerator } from './generators/single-elimination.generator';
import { TournamentPhase } from '../entities/tournament-phase.entity';
import { GroupStageGenerator } from './generators/group-stage.generator';

/** Phase types that are played as groups and ranked by standings rather than by a tree. */
export const GROUP_PHASE_TYPES = ['GROUP_STAGE', 'ROUND_ROBIN'];

@Injectable()
export class BracketGeneratorService {
    /** Creates a phase's matches for an already seeded field (seed 1 first). */
    async generate(
        manager: EntityManager,
        phase: TournamentPhase,
        seeded: Team[],
        tournamentId: number,
    ): Promise<Match[]> {
        const ctx = { phaseId: phase.id, tournamentId, gameId: phase.game_id ?? null };

        switch (phase.type) {
            case 'SINGLE_ELIMINATION':
                return new SingleEliminationGenerator(manager).build(seeded, ctx);

            case 'GROUP_STAGE':
                return new GroupStageGenerator(manager).build(seeded, ctx, phase.group_size || 4);

            case 'ROUND_ROBIN':
                return new GroupStageGenerator(manager).build(seeded, ctx, Math.max(2, seeded.length));

            default:
                throw new BadRequestException(`${phase.type} phases are not supported yet.`);
        }
    }
}
