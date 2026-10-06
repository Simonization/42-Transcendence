import { MigrationInterface, QueryRunner } from 'typeorm';

/*
 * Data only, no schema change: makes brackets started under the old engine (the deploy before
 * migrations, commit bb033ea) playable by the current one.
 *
 * The old single-elimination generator popped teams two at a time into an unseeded tree, so a
 * field that is not a power of two left first-round matches with one team or none, all WAITING
 * and without a feeder: nothing ever moved them on and the bracket stalled. Started tournaments
 * also have no `seed_order`, which the current engine reads for tiebreaks.
 *
 * In ONGOING tournaments, single-elimination phases, this applies the engine's own rules
 * (BracketEngine) until nothing changes:
 *   - a settled feeder's winner sits in the slot it feeds (repairs any lost propagation);
 *   - a WAITING match short of a team, whose empty slots can no longer be fed (no feeder, or
 *     every feeder of that slot settled without a winner), is a BYE won by its lone team, who
 *     moves into the next match's slot, or CANCELLED when it has no team at all;
 *   - a WAITING match with both teams is READY.
 * Then ONGOING / COMPLETED tournaments without a seed order get one: their LOCKED and ARCHIVED
 * teams by id, the order the engine falls back to.
 *
 * On data the current engine wrote, none of these conditions hold, so it changes nothing.
 * down() is a no-op: the old state was a stalled bracket, not something to go back to.
 */
export class LegacyBracketRepair1790800000000 implements MigrationInterface {
    name = 'LegacyBracketRepair1790800000000';

    /** Matches this migration may touch: knockout phases of running tournaments. */
    private static readonly SCOPE = `
        "matches" m
        JOIN "tournament_phases" p ON p."id" = m."phase_id"
        JOIN "tournaments" t ON t."id" = p."tournament_id"
       WHERE t."status" = 'ONGOING' AND p."type" = 'SINGLE_ELIMINATION'`;

    private static readonly SETTLED = `('FINISHED', 'CANCELLED', 'BYE')`;

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Each pass settles at least one match or stops; a bracket of 2^k slots needs at most k.
        for (let pass = 0; pass < 32; pass++) {
            const changed =
                (await this.placeWinners(queryRunner)) +
                (await this.resolveDeadEnds(queryRunner)) +
                (await this.markReady(queryRunner));
            if (changed === 0) break;
        }
        await this.backfillSeedOrder(queryRunner);
    }

    public async down(): Promise<void> {
        // Nothing to undo; see the comment at the top.
    }

    /** Settled feeders whose winner is missing from the slot they feed. */
    private async placeWinners(q: QueryRunner): Promise<number> {
        let changed = 0;
        for (const slot of [1, 2]) {
            const [, count] = await q.query(`
                UPDATE "matches" n
                   SET "team${slot}_id" = f."winner_id"
                  FROM "matches" f, "tournament_phases" p, "tournaments" t
                 WHERE f."winner_next_match_id" = n."id"
                   AND COALESCE(f."winner_next_match_slot", 1) = ${slot}
                   AND f."status" IN ${LegacyBracketRepair1790800000000.SETTLED}
                   AND f."winner_id" IS NOT NULL
                   AND n."team${slot}_id" IS NULL
                   AND n."status" = 'WAITING'
                   AND p."id" = n."phase_id" AND t."id" = p."tournament_id"
                   AND t."status" = 'ONGOING' AND p."type" = 'SINGLE_ELIMINATION'
            `);
            changed += count ?? 0;
        }
        return changed;
    }

    /** WAITING matches short of a team whose empty slots nothing can fill any more. */
    private async resolveDeadEnds(q: QueryRunner): Promise<number> {
        const rows: { id: number; team1_id: number | null; team2_id: number | null }[] = await q.query(`
            SELECT m."id", m."team1_id", m."team2_id"
              FROM ${LegacyBracketRepair1790800000000.SCOPE}
               AND m."status" = 'WAITING'
               AND (m."team1_id" IS NULL OR m."team2_id" IS NULL)
               AND NOT EXISTS (
                     SELECT 1 FROM "matches" f
                      WHERE f."winner_next_match_id" = m."id"
                        AND ((COALESCE(f."winner_next_match_slot", 1) = 1 AND m."team1_id" IS NULL)
                          OR (f."winner_next_match_slot" = 2 AND m."team2_id" IS NULL))
                        AND (f."status" NOT IN ${LegacyBracketRepair1790800000000.SETTLED}
                             OR f."winner_id" IS NOT NULL))
             ORDER BY m."id"
        `);

        for (const m of rows) {
            const lone = m.team1_id ?? m.team2_id;
            if (lone == null) {
                await q.query(`UPDATE "matches" SET "status" = 'CANCELLED' WHERE "id" = $1`, [m.id]);
                continue;
            }
            await q.query(
                `UPDATE "matches" SET "status" = 'BYE', "winner_id" = $2, "finished_at" = now() WHERE "id" = $1`,
                [m.id, lone],
            );
        }
        // The BYE winners move on through placeWinners in the next pass.
        return rows.length;
    }

    private async markReady(q: QueryRunner): Promise<number> {
        const [, count] = await q.query(`
            UPDATE "matches" SET "status" = 'READY'
             WHERE "id" IN (
                   SELECT m."id" FROM ${LegacyBracketRepair1790800000000.SCOPE}
                      AND m."status" = 'WAITING'
                      AND m."team1_id" IS NOT NULL AND m."team2_id" IS NOT NULL)
        `);
        return count ?? 0;
    }

    private async backfillSeedOrder(q: QueryRunner): Promise<void> {
        await q.query(`
            UPDATE "tournaments" t
               SET "seed_order" = COALESCE((
                     SELECT jsonb_agg(tm."id" ORDER BY tm."id")
                       FROM "teams" tm
                      WHERE tm."tournamentId" = t."id" AND tm."status" IN ('LOCKED', 'ARCHIVED')
                   ), '[]'::jsonb)
             WHERE t."status" IN ('ONGOING', 'COMPLETED') AND t."seed_order" IS NULL
        `);
    }
}
