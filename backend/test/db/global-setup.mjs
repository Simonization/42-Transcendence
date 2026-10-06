/*
 * npm run test:db — starts a throwaway Postgres 15 (embedded-postgres, the dev dependency
 * `npm run migration:verify` uses too; no docker) for the *.db-spec.ts suites, which need real
 * row locks and real SQL. Plain ESM because embedded-postgres is ESM-only and jest's module
 * sandbox cannot import it; globalSetup runs outside that sandbox.
 *
 * Each suite creates its own database (src/testing/test-db.testing-spec.ts). TEST_DB_PORT picks
 * the port (default 55441).
 */
import EmbeddedPostgres from 'embedded-postgres';
import { mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

export default async function globalSetup() {
    const port = parseInt(process.env.TEST_DB_PORT || '55441');
    const dir = mkdtempSync(join(tmpdir(), 'test-db-'));
    const pg = new EmbeddedPostgres({
        databaseDir: join(dir, 'data'),
        user: 'postgres',
        password: 'postgres',
        port,
        persistent: false,
        onLog: () => undefined,
    });
    await pg.initialise();
    await pg.start();
    globalThis.__TEST_PG__ = { pg, dir };
    // Test workers start after this and inherit the environment.
    process.env.TEST_DB_PORT = String(port);
}
