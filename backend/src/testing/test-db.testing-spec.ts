/**
 * A fresh, fully migrated database per suite, on the Postgres that `npm run test:db` starts
 * (test/db/global-setup.mjs). For the *.db-spec.ts suites only.
 *
 * Named *.testing-spec.ts so the build excludes it and jest does not run it as a suite.
 */
import 'reflect-metadata';
import { DataSource, DataSourceOptions } from 'typeorm';
import { databaseOptions } from '../database/database-options';

let counter = 0;

function options(database: string): DataSourceOptions {
    const port = process.env.TEST_DB_PORT;
    if (!port) throw new Error('TEST_DB_PORT is not set: run the *.db-spec.ts suites with `npm run test:db`.');
    return {
        ...databaseOptions({
            DB_TYPE: 'postgres',
            DB_HOST: 'localhost',
            DB_PORT: port,
            DB_USERNAME: 'postgres',
            DB_PASSWORD: 'postgres',
            DB_DATABASE: database,
        }),
        synchronize: false,
        migrationsRun: false,
        logging: false,
    } as DataSourceOptions;
}

/** Creates an empty database and returns its name. */
export async function createDatabase(prefix = 'test'): Promise<string> {
    const name = `${prefix}_${process.pid}_${Date.now()}_${counter++}`;
    const admin = new DataSource(options('postgres'));
    await admin.initialize();
    try {
        await admin.query(`CREATE DATABASE "${name}"`);
    } finally {
        await admin.destroy();
    }
    return name;
}

/** A DataSource on `database`; pass `migrations` to run only some (default: all of them). */
export async function openDataSource(database: string, migrations?: DataSourceOptions['migrations']): Promise<DataSource> {
    const ds = new DataSource({ ...options(database), ...(migrations ? { migrations } : {}) } as DataSourceOptions);
    await ds.initialize();
    return ds;
}

/** A new database with every migration applied. */
export async function migratedDataSource(prefix = 'test'): Promise<DataSource> {
    const ds = await openDataSource(await createDatabase(prefix));
    await ds.runMigrations({ transaction: 'all' });
    return ds;
}
