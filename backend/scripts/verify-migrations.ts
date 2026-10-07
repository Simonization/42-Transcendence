/*
 * npm run migration:verify
 *
 * Starts a throwaway Postgres 15 (embedded-postgres, no docker needed) and checks that:
 *
 *  1. schema: an empty database migrated with every migration ends up with exactly the schema
 *     synchronize builds from the current entities (catalog snapshot compared, and the schema
 *     builder has nothing left to do). Fails when an entity changed without a migration.
 *  2. upgrade: a database at the Baseline, holding rows in the old shape (a started bracket in
 *     match_teams, teams without join codes, ...), goes through the later migrations with its
 *     data carried over, reverts cleanly, and migrates again.
 *
 * MIGRATION_VERIFY_PORT picks the port (default 55440). Nothing is left behind.
 */
import 'reflect-metadata';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { DataSource, DataSourceOptions } from 'typeorm';
import { databaseOptions } from '../src/database/database-options';
import { Baseline1790793062515 } from '../src/database/migrations/1790793062515-Baseline';

const PORT = parseInt(process.env.MIGRATION_VERIFY_PORT || '55440');
const USER = 'postgres';
const PASSWORD = 'postgres';

function options(database: string, overrides: Partial<DataSourceOptions> = {}): DataSourceOptions {
    return {
        ...databaseOptions({
            DB_TYPE: 'postgres',
            DB_HOST: 'localhost',
            DB_PORT: String(PORT),
            DB_USERNAME: USER,
            DB_PASSWORD: PASSWORD,
            DB_DATABASE: database,
        }),
        synchronize: false,
        migrationsRun: false,
        logging: false,
        ...overrides,
    } as DataSourceOptions;
}

async function withDataSource<T>(opts: DataSourceOptions, fn: (ds: DataSource) => Promise<T>): Promise<T> {
    const ds = new DataSource(opts);
    await ds.initialize();
    try {
        return await fn(ds);
    } finally {
        await ds.destroy();
    }
}

/** Everything about the public schema that a migration can get wrong, as sorted lines. */
async function snapshot(ds: DataSource): Promise<string[]> {
    const parts = await Promise.all([
        ds.query(`
            SELECT 'column ' || table_name || '.' || column_name || ' ' || udt_name
                   || COALESCE('(' || character_maximum_length || ')', '')
                   || CASE WHEN is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END
                   || COALESCE(' DEFAULT ' || column_default, '') AS line
              FROM information_schema.columns
             WHERE table_schema = 'public' AND table_name <> 'migrations'`),
        ds.query(`
            SELECT 'constraint ' || c.conrelid::regclass || ' ' || c.conname || ' '
                   || pg_get_constraintdef(c.oid) AS line
              FROM pg_constraint c
              JOIN pg_namespace n ON n.oid = c.connamespace
             WHERE n.nspname = 'public' AND c.conrelid::regclass::text <> 'migrations'`),
        ds.query(`
            SELECT 'index ' || indexdef AS line
              FROM pg_indexes
             WHERE schemaname = 'public' AND tablename <> 'migrations'`),
        ds.query(`
            SELECT 'enum ' || t.typname || ' ' || string_agg(e.enumlabel, ',' ORDER BY e.enumsortorder) AS line
              FROM pg_type t
              JOIN pg_enum e ON e.enumtypid = t.oid
              JOIN pg_namespace n ON n.oid = t.typnamespace
             WHERE n.nspname = 'public'
          GROUP BY t.typname`),
        ds.query(`
            SELECT 'sequence ' || sequence_name AS line
              FROM information_schema.sequences
             WHERE sequence_schema = 'public' AND sequence_name <> 'migrations_id_seq'`),
    ]);
    return parts
        .flat()
        .map((r: { line: string }) => r.line)
        .sort();
}

function assert(condition: unknown, message: string): asserts condition {
    if (!condition) throw new Error(`upgrade check failed: ${message}`);
}

async function checkSchema(): Promise<void> {
    // Indexes an entity declares with `synchronize: false` (expression indexes TypeORM cannot
    // build) exist only after the migrations: they must be there, and are left out of the diff.
    let manual: string[] = [];
    const migrated = await withDataSource(options('verify_migrated'), async (ds) => {
        await ds.runMigrations({ transaction: 'all' });
        const pending = await ds.driver.createSchemaBuilder().log();
        if (pending.upQueries.length) {
            console.error('Entities and migrations disagree; migration:generate would emit:');
            for (const q of pending.upQueries) console.error('  ' + q.query.trim());
            throw new Error('schema check failed: the migrations do not produce the entities\' schema');
        }
        manual = ds.entityMetadatas.flatMap((m) =>
            m.indices.filter((i) => i.synchronize === false && i.name).map((i) => i.name),
        );
        const lines = await snapshot(ds);
        for (const name of manual) {
            if (!lines.some((l) => l.startsWith('index ') && l.includes(`"${name}"`))) {
                throw new Error(`schema check failed: no migration creates the index ${name}`);
            }
        }
        return lines.filter((l) => !manual.some((name) => l.startsWith('index ') && l.includes(`"${name}"`)));
    });
    const synced = await withDataSource(options('verify_synced', { synchronize: true }), snapshot);

    const onlyMigrated = migrated.filter((l) => !synced.includes(l));
    const onlySynced = synced.filter((l) => !migrated.includes(l));
    if (onlyMigrated.length || onlySynced.length) {
        for (const l of onlyMigrated) console.error('  only after migrations: ' + l);
        for (const l of onlySynced) console.error('  only after synchronize: ' + l);
        throw new Error('schema check failed: migrated and synchronized schemas differ');
    }
    console.log(
        `schema: OK (${migrated.length} catalog entries identical, nothing left to generate; ` +
            `${manual.length} migration-only index(es) present: ${manual.join(', ') || 'none'})`,
    );
}

/** Old-shape rows, as the app of the Baseline deploy wrote them. */
const SEED = `
    INSERT INTO "users" ("id", "username", "mail", "password_hash") VALUES
        (1, 'alice', 'alice@example.test', 'x'), (2, 'bob', 'bob@example.test', 'x'),
        (3, 'carol', 'carol@example.test', 'x'), (4, 'dave', 'dave@example.test', 'x'),
        (5, 'erin', 'erin@example.test', 'x');
    SELECT setval('users_id_seq', 5);
    INSERT INTO "games" ("id", "name") VALUES (1, 'Game');
    INSERT INTO "tournaments" ("id", "name", "status")
        VALUES (1, 'Cup', 'ONGOING'), (2, 'League', 'ONGOING');
    INSERT INTO "tournament_phases" ("id", "tournament_id", "order", "type", "game_id", "group_size")
        VALUES (1, 1, 1, 'SINGLE_ELIMINATION', 1, NULL), (2, 2, 1, 'GROUP_STAGE', 1, 3);
    INSERT INTO "teams" ("id", "name", "status", "captain_id", "tournamentId") VALUES
        (10, 'Ten', 'LOCKED', 1, 1), (11, 'Eleven', 'LOCKED', 2, 1),
        (12, 'Twelve', 'LOCKED', 3, 1), (13, 'Thirteen', 'LOCKED', 4, 1),
        (20, 'Twenty', 'DRAFT', 5, 2),
        -- Same name as team 20 once trimmed and lower-cased (TeamNameUnique renames it).
        (21, ' twenty ', 'DRAFT', 4, 2);
    INSERT INTO "team_members" ("team_id", "user_id") VALUES (10, 1), (11, 2), (12, 3), (13, 4), (20, 5);
    INSERT INTO "team_invitations" ("team_id", "sender_id", "receiver_id", "status")
        VALUES (10, 1, 5, 'PENDING'), (11, 2, 5, 'DECLINED');
    INSERT INTO "notifications" ("user_id", "type", "body") VALUES (5, 'team_invite', 'join us');
    -- Knockout: final 100 (round 2) fed by semis 101 (slot 1) and 102 (slot 2). Semi 102 is
    -- finished and its winner, team 13, already sits in the final; semi 101 is not played yet.
    INSERT INTO "matches" ("id", "phase_id", "round_order", "status", "winner_id",
                           "winner_next_match_id", "winner_next_match_slot") VALUES
        (100, 1, 2, 'WAITING', NULL, NULL, NULL),
        (101, 1, 1, 'WAITING', NULL, 100, 1),
        (102, 1, 1, 'FINISHED', 13, 100, 2);
    -- Group stage match, group B.
    INSERT INTO "matches" ("id", "phase_id", "round_order", "status", "game_data")
        VALUES (200, 2, 1, 'WAITING', '{"group": "B"}');
    INSERT INTO "match_teams" ("match_id", "team_id") VALUES
        (100, 13), (101, 11), (101, 10), (102, 13), (102, 12), (200, 20);
    -- A 3-team knockout as the old generator built it: final 300 fed by 301 (slot 1) and 302
    -- (slot 2); teams popped off the end two at a time, so leaf 302 holds team 30 alone. It
    -- stalls: nothing ever settles 302. (LegacyBracketRepair)
    INSERT INTO "tournaments" ("id", "name", "status") VALUES (3, 'Legacy', 'ONGOING');
    INSERT INTO "tournament_phases" ("id", "tournament_id", "order", "type", "game_id")
        VALUES (3, 3, 1, 'SINGLE_ELIMINATION', 1);
    UPDATE "tournaments" SET "active_phase_id" = 3 WHERE "id" = 3;
    INSERT INTO "teams" ("id", "name", "status", "captain_id", "tournamentId") VALUES
        (30, 'Thirty', 'LOCKED', 1, 3), (31, 'Thirty-one', 'LOCKED', 2, 3), (32, 'Thirty-two', 'LOCKED', 3, 3);
    INSERT INTO "team_members" ("team_id", "user_id") VALUES (30, 1), (31, 2), (32, 3);
    INSERT INTO "matches" ("id", "phase_id", "round_order", "status",
                           "winner_next_match_id", "winner_next_match_slot") VALUES
        (300, 3, 2, 'WAITING', NULL, NULL),
        (301, 3, 1, 'WAITING', 300, 1),
        (302, 3, 1, 'WAITING', 300, 2);
    INSERT INTO "match_teams" ("match_id", "team_id") VALUES (301, 32), (301, 31), (302, 30);
`;

async function checkUpgrade(): Promise<void> {
    // Baseline only, then old-shape rows.
    await withDataSource(options('verify_upgrade', { migrations: [Baseline1790793062515] }), async (ds) => {
        await ds.runMigrations({ transaction: 'all' });
    });
    await withDataSource(options('verify_upgrade', { migrations: [] }), async (ds) => {
        // No parameters: pg sends it as one simple query, several statements in one transaction.
        await ds.query(SEED);
    });

    await withDataSource(options('verify_upgrade'), async (ds) => {
        const ran = await ds.runMigrations({ transaction: 'all' });
        assert(ran.length > 0, 'no migration ran after the Baseline');

        const matches: any[] = await ds.query(
            `SELECT "id", "team1_id", "team2_id", "status", "tournament_id", "game_id", "group_index"
               FROM "matches" ORDER BY "id"`);
        const byId = new Map(matches.map((m) => [m.id, m]));
        // The final keeps team 13 in slot 2, the slot its semi feeds; slot 1 waits for semi 101.
        assert(byId.get(100).team1_id === null && byId.get(100).team2_id === 13, 'final slots');
        assert(byId.get(100).status === 'WAITING', 'final stays WAITING');
        // Unplaced teams fill slots by ascending id.
        assert(byId.get(101).team1_id === 10 && byId.get(101).team2_id === 11, 'semi 101 slots');
        assert(byId.get(101).status === 'READY', 'semi 101 becomes READY');
        assert(byId.get(102).team1_id === 12 && byId.get(102).team2_id === 13, 'semi 102 slots');
        assert(byId.get(102).status === 'FINISHED', 'finished semi stays FINISHED');
        assert(byId.get(200).team1_id === 20 && byId.get(200).group_index === 1, 'group match');
        assert(matches.every((m) => m.game_id === 1), 'game_id backfilled from the phase');
        assert(byId.get(100).tournament_id === 1 && byId.get(200).tournament_id === 2, 'tournament_id backfilled');
        // Legacy bracket repaired: the lone team's leaf is a bye, its team waits in the final's
        // slot 2, the full leaf is playable.
        assert(byId.get(302).status === 'BYE' && byId.get(302).team1_id === 30, 'legacy bye resolved');
        assert(byId.get(300).team1_id === null && byId.get(300).team2_id === 30, 'legacy bye advanced to its slot');
        assert(byId.get(300).status === 'WAITING' && byId.get(301).status === 'READY', 'legacy bracket playable');
        const seeds: any[] = await ds.query(`SELECT "id", "seed_order" FROM "tournaments" ORDER BY "id"`);
        assert(
            JSON.stringify(seeds.map((t) => t.seed_order)) === JSON.stringify([[10, 11, 12, 13], [], [30, 31, 32]]),
            'seed_order backfilled from LOCKED teams',
        );

        const teams: any[] = await ds.query(`SELECT "id", "name", "join_code" FROM "teams" ORDER BY "id"`);
        assert(teams.length === 9, 'teams kept');
        const nameOf = (id: number) => teams.find((t) => t.id === id)?.name;
        assert(nameOf(20) === 'Twenty' && nameOf(21) === 'twenty #21', 'duplicate team name renamed, oldest kept');
        const [{ n: nameIndexes }] = await ds.query(
            `SELECT count(*)::int AS n FROM pg_indexes WHERE indexname = 'UQ_teams_tournament_name'`);
        assert(nameIndexes === 1, 'team name index built');
        assert(teams.every((t) => /^[A-HJ-NP-Za-km-z2-9]{10}$/.test(t.join_code)), 'join codes in the app format');
        assert(new Set(teams.map((t) => t.join_code)).size === teams.length, 'join codes unique');

        const invitations: any[] = await ds.query(`SELECT "status", "direction" FROM "team_invitations" ORDER BY "id"`);
        assert(invitations.length === 2 && invitations.every((i) => i.direction === 'INVITE'), 'invitations kept as INVITE');
        assert(invitations[1].status === 'DECLINED', 'invitation status kept');
        const [{ count: members }] = await ds.query(`SELECT count(*)::int AS count FROM "team_members"`);
        assert(members === 8, 'team members kept');
        const [{ count: notifications }] = await ds.query(`SELECT count(*)::int AS count FROM "notifications"`);
        assert(notifications === 1, 'notifications kept');
        const [{ exists }] = await ds.query(`SELECT to_regclass('public.match_teams') IS NOT NULL AS exists`);
        assert(!exists, 'match_teams dropped');

        // Revert: match_teams comes back with the same pairs, new rows the old schema cannot
        // hold are mapped (CANCELLED) or dropped (join requests).
        await ds.query(`UPDATE "team_invitations" SET "status" = 'CANCELLED' WHERE "status" = 'PENDING'`);
        await ds.query(`INSERT INTO "team_invitations" ("team_id", "sender_id", "receiver_id", "direction")
                        VALUES (20, 4, 5, 'REQUEST')`);
        // Back to the Baseline, one migration at a time.
        for (;;) {
            const [{ count }] = await ds.query(`SELECT count(*)::int AS count FROM "migrations"`);
            if (count <= 1) break;
            await ds.undoLastMigration({ transaction: 'all' });
        }
        const pairs: any[] = await ds.query(
            `SELECT "match_id", "team_id" FROM "match_teams" ORDER BY "match_id", "team_id"`);
        assert(
            JSON.stringify(pairs.map((p) => [p.match_id, p.team_id])) ===
                JSON.stringify([[100, 13], [101, 10], [101, 11], [102, 12], [102, 13], [200, 20],
                                [300, 30], [301, 31], [301, 32], [302, 30]]),
            'match_teams restored on revert',
        );
        const statuses: any[] = await ds.query(`SELECT "status" FROM "team_invitations" ORDER BY "id"`);
        assert(statuses.map((s) => s.status).join() === 'DECLINED,DECLINED', 'revert maps CANCELLED, drops requests');

        // And forward again, from the reverted state.
        await ds.runMigrations({ transaction: 'all' });
        const [final] = await ds.query(`SELECT "team1_id", "team2_id" FROM "matches" WHERE "id" = 100`);
        assert(final.team1_id === null && final.team2_id === 13, 're-run after revert');
        const [again] = await ds.query(`SELECT "name" FROM "teams" WHERE "id" = 21`);
        assert(again.name === 'twenty #21', 'team names stable across revert and re-run');
    });
    console.log('upgrade: OK (old rows carried over, revert and re-run clean)');
}

async function main(): Promise<void> {
    // embedded-postgres is ESM-only; a dynamic import loads it from this CommonJS script.
    const { default: EmbeddedPostgres } = await import('embedded-postgres');
    const dir = mkdtempSync(join(tmpdir(), 'verify-migrations-'));
    const pg = new EmbeddedPostgres({
        databaseDir: join(dir, 'data'),
        user: USER,
        password: PASSWORD,
        port: PORT,
        persistent: false,
        onLog: () => undefined,
    });
    let failed = false;
    try {
        await pg.initialise();
        await pg.start();
        for (const db of ['verify_migrated', 'verify_synced', 'verify_upgrade']) await pg.createDatabase(db);
        await checkSchema();
        await checkUpgrade();
    } catch (err) {
        failed = true;
        console.error(err instanceof Error ? err.message : err);
    } finally {
        await pg.stop().catch(() => undefined);
        rmSync(dir, { recursive: true, force: true });
    }
    process.exit(failed ? 1 : 0);
}

void main();
