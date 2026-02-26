import { Injectable, NotFoundException } from "@nestjs/common";
import { DataSource } from "typeorm";
import { Match } from "../entities/match.entity";

@Injectable()
export class DeleteMatchCommand {
    constructor(private dataSource: DataSource) {}

    async execute(id: number): Promise<void> {
        // 1. Check existence first
        const match = await this.dataSource.getRepository(Match).findOneBy({ id });
        if (!match) throw new NotFoundException(`Match with ID ${id} not found`);

        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            // 2. Simply delete the Match
            // Because we use JSONB, there is no external 'game_match' table to clean up
            await queryRunner.manager.delete(Match, id);

            await queryRunner.commitTransaction();
        } catch (err) {
            await queryRunner.rollbackTransaction();
            throw err;
        } finally {
            await queryRunner.release();
        }
    }
}