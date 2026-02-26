import { Injectable } from '@nestjs/common';
import { Match } from '../../matches/entities/match.entity';
import { Team } from '../../teams/entities/team.entity';
import { SingleEliminationGenerator } from './generators/single-elimination.generator';
import { TournamentPhase } from '../entities/tournament-phase.entity';
import { GroupStageGenerator } from './generators/group-stage.generator';

@Injectable()
export class BracketGeneratorService {
    
    // We pass the whole Phase object to access group_size, swiss_rounds, etc.
    async generate(queryRunner: any, phase: TournamentPhase, teams: Team[]): Promise<void | Partial<Match>[]> {
        switch (phase.type) {
            case 'SINGLE_ELIMINATION':
                const singleElim = new SingleEliminationGenerator(queryRunner);
                return await singleElim.build(teams, phase.id);

            case 'GROUP_STAGE':
                const groupStage = new GroupStageGenerator(queryRunner);
                // Accessing the new parameters we added to the entity
                return await groupStage.build(teams, phase.id, phase.group_size);

            // case 'DOUBLE_ELIMINATION':
            //     return this.buildDoubleElimination(teams, phase.id);

            // case 'SWISS':
            //     // Using the swiss_rounds parameter
            //     return this.buildSwissRound(teams, phase.id, phase.swiss_rounds);

            default:
                throw new Error(`Algorithm for ${phase.type} not implemented.`);
        }
    }
}