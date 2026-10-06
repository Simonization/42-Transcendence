import { MigrationInterface, QueryRunner } from 'typeorm';

/*
 * users.deleted_at: a deleted account becomes a tombstone (personal data erased, row kept so
 * messages and match history keep their author). See DeleteUserCommand.
 */
export class AccountTombstone1790800100000 implements MigrationInterface {
    name = 'AccountTombstone1790800100000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "users"
            ADD "deleted_at" TIMESTAMP
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "users" DROP COLUMN "deleted_at"
        `);
    }
}
