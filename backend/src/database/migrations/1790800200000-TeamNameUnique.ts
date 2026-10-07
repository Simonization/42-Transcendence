import { MigrationInterface, QueryRunner } from 'typeorm';

/*
 * Team names unique per tournament, compared case-insensitively and trimmed (utils/team-name.ts).
 *
 * Existing duplicates are renamed first so the index can always be built: within each
 * (tournament, lower(btrim(name))) group the oldest team (lowest id) keeps its name, every other
 * one becomes "<name> #<id>". If such a new name happens to clash with yet another team, the next
 * pass suffixes it again; ten passes without settling abort the migration (nothing applied).
 * Teams outside a tournament are not constrained (partial index).
 *
 * down() drops the index; renamed teams keep their new names.
 */
export class TeamNameUnique1790800200000 implements MigrationInterface {
    name = 'TeamNameUnique1790800200000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DO $$
            DECLARE
                renamed integer;
                pass integer := 0;
            BEGIN
                LOOP
                    UPDATE "teams" t
                       SET "name" = btrim(t."name") || ' #' || t."id"
                      FROM (
                            SELECT "id",
                                   row_number() OVER (
                                       PARTITION BY "tournamentId", lower(btrim("name")) ORDER BY "id"
                                   ) AS rn
                              FROM "teams"
                             WHERE "tournamentId" IS NOT NULL
                           ) d
                     WHERE d."id" = t."id" AND d.rn > 1;
                    GET DIAGNOSTICS renamed = ROW_COUNT;
                    EXIT WHEN renamed = 0;
                    pass := pass + 1;
                    IF pass >= 10 THEN
                        RAISE EXCEPTION 'TeamNameUnique: duplicate team names did not settle after % passes', pass;
                    END IF;
                END LOOP;
            END
            $$
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "UQ_teams_tournament_name"
                ON "teams" ("tournamentId", lower(btrim("name")))
                WHERE "tournamentId" IS NOT NULL
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."UQ_teams_tournament_name"`);
    }
}
