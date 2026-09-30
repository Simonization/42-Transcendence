import { databaseOptions, shouldRunMigrations } from './database-options';

describe('database options', () => {
    it('runs migrations on boot when synchronize is off and nothing says otherwise', () => {
        expect(shouldRunMigrations({}, false)).toBe(true);
        expect(databaseOptions({ DB_SYNCHRONIZE: 'false' })).toMatchObject({
            synchronize: false,
            migrationsRun: true,
        });
    });

    it('leaves a synchronized dev database alone by default', () => {
        expect(databaseOptions({ DB_SYNCHRONIZE: 'true' })).toMatchObject({
            synchronize: true,
            migrationsRun: false,
        });
    });

    it('lets DB_MIGRATIONS_RUN override the default either way', () => {
        expect(shouldRunMigrations({ DB_MIGRATIONS_RUN: 'false' }, false)).toBe(false);
        expect(shouldRunMigrations({ DB_MIGRATIONS_RUN: 'true' }, true)).toBe(true);
    });

    it('loads the migrations next to it, from src under ts-node and dist when built', () => {
        const { migrations } = databaseOptions({}) as { migrations: string[] };
        expect(migrations).toHaveLength(1);
        expect(migrations[0]).toMatch(/database[\\/]migrations[\\/]\*\{\.ts,\.js\}$/);
    });
});
