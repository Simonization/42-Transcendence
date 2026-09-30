import { EntityManager } from 'typeorm';
import { Match, MatchStatus } from '../../../matches/entities/match.entity';
import { Team } from '../../../teams/entities/team.entity';
import { groupLabel, roundRobinRounds, snakeGroups } from '../seeding';
import { GeneratorContext } from './single-elimination.generator';

/**
 * Splits the seeded field into groups (snake draft, so each group gets a top seed) and schedules
 * a round robin inside each. Each match records its group (`group_index`) and matchday
 * (`round_order`), so group rounds stay distinct from each other and from knockout rounds.
 * A round robin phase is one group holding the whole field.
 */
export class GroupStageGenerator {
    constructor(private readonly manager: EntityManager) {}

    async build(seeded: Team[], ctx: GeneratorContext, groupSize: number): Promise<Match[]> {
        const groups = snakeGroups(seeded, groupSize);
        const rows: Match[] = [];

        groups.forEach((group, groupIndex) => {
            roundRobinRounds(group).forEach((pairs, roundIndex) => {
                for (const [a, b] of pairs) {
                    rows.push(
                        this.manager.create(Match, {
                            phase_id: ctx.phaseId,
                            tournament_id: ctx.tournamentId,
                            game_id: ctx.gameId as number,
                            status: MatchStatus.READY,
                            round_order: roundIndex + 1,
                            group_index: groupIndex,
                            game_data: { group: groupLabel(groupIndex) },
                            team1_id: a.id,
                            team2_id: b.id,
                        }),
                    );
                }
            });
        });

        return rows.length ? await this.manager.save(Match, rows) : [];
    }
}
