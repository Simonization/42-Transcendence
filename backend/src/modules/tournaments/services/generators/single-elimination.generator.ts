import { EntityManager } from 'typeorm';
import { Match, MatchStatus } from '../../../matches/entities/match.entity';
import { Team } from '../../../teams/entities/team.entity';
import { bracketSize, firstRoundPairs } from '../seeding';

export interface GeneratorContext {
    phaseId: number;
    tournamentId: number;
    gameId: number | null;
}

/**
 * Builds a single-elimination tree from an already seeded list (seed 1 first).
 *
 * Standard seeding: 1 v N, byes to the top seeds, at most one bye per match (see
 * `firstRoundPairs`). A first-round match with a single team is saved as BYE with that team as
 * winner; the caller advances it. Rows are saved final-first so each child can point at its
 * parent through winner_next_match_id / winner_next_match_slot.
 */
export class SingleEliminationGenerator {
    constructor(private readonly manager: EntityManager) {}

    async build(seeded: Team[], ctx: GeneratorContext): Promise<Match[]> {
        const size = bracketSize(seeded.length);
        const totalRounds = Math.log2(size);
        const pairs = firstRoundPairs(seeded.length);
        const created: Match[] = [];

        let parents: Match[] = [];
        for (let round = totalRounds; round >= 1; round--) {
            const count = size / Math.pow(2, round);
            const rows: Match[] = [];

            for (let i = 0; i < count; i++) {
                const parent = parents[Math.floor(i / 2)];
                const base: Partial<Match> = {
                    phase_id: ctx.phaseId,
                    tournament_id: ctx.tournamentId,
                    game_id: ctx.gameId as number,
                    round_order: round,
                    group_index: null,
                    winner_next_match_id: parent ? parent.id : (null as any),
                    winner_next_match_slot: parent ? (i % 2) + 1 : (null as any),
                    status: MatchStatus.WAITING,
                    game_data: {},
                    team1_id: null,
                    team2_id: null,
                };

                if (round === 1) {
                    const [a, b] = pairs[i];
                    const t1 = a !== null ? seeded[a] : null;
                    const t2 = b !== null ? seeded[b] : null;
                    base.team1_id = t1?.id ?? null;
                    base.team2_id = t2?.id ?? null;
                    if (t1 && t2) {
                        base.status = MatchStatus.READY;
                    } else {
                        base.status = MatchStatus.BYE;
                        base.winner_id = (t1 ?? t2)!.id;
                        base.finished_at = new Date();
                    }
                }
                rows.push(this.manager.create(Match, base));
            }

            parents = await this.manager.save(Match, rows);
            created.push(...parents);
        }

        return created;
    }
}
