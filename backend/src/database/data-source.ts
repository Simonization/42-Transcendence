import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { databaseOptions } from './database-options';

/*
 * DataSource for the TypeORM CLI (npm run migration:*). It reads the same DB_* variables as
 * the app; set them in the shell, e.g. DB_HOST=localhost DB_PORT=5433 for the dev compose
 * database. The CLI never synchronizes or auto-runs migrations: it only does what it is told.
 */
export default new DataSource({
    ...databaseOptions(),
    synchronize: false,
    migrationsRun: false,
});
