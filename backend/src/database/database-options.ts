import { join } from 'path';
import { DataSourceOptions } from 'typeorm';

/*
 * Connection settings shared by the Nest app (app.module.ts) and the TypeORM CLI
 * (data-source.ts), so both always talk to the same database with the same entities and
 * migrations. Globs are relative to this file: they match src/**\/*.ts under ts-node and
 * dist/**\/*.js in the built app (TypeORM skips the emitted .d.ts files).
 */
export function databaseOptions(env: NodeJS.ProcessEnv = process.env): DataSourceOptions {
    const synchronize = env.DB_SYNCHRONIZE === 'true';
    return {
        type: (env.DB_TYPE as any) || 'postgres',
        host: env.DB_HOST || 'db',
        port: parseInt(env.DB_PORT || '5432'),
        username: env.DB_USERNAME || 'user',
        password: env.DB_PASSWORD || 'password',
        database: env.DB_DATABASE || 'transcendence_db',
        entities: [join(__dirname, '..', '**', '*.entity{.ts,.js}')],
        migrations: [join(__dirname, 'migrations', '*{.ts,.js}')],
        migrationsTableName: 'migrations',
        synchronize,
        migrationsRun: shouldRunMigrations(env, synchronize),
    } as DataSourceOptions;
}

/**
 * DB_MIGRATIONS_RUN=true|false wins when set. Unset, migrations run on boot exactly when
 * synchronize is off: production (DB_SYNCHRONIZE=false) migrates itself, while a local
 * database that synchronize built is left alone (running the Baseline on top of it would fail
 * on tables that already exist).
 */
export function shouldRunMigrations(env: NodeJS.ProcessEnv, synchronize: boolean): boolean {
    if (env.DB_MIGRATIONS_RUN === 'true') return true;
    if (env.DB_MIGRATIONS_RUN === 'false') return false;
    return !synchronize;
}
