import { Injectable, NotFoundException } from "@nestjs/common";
import { DataSource } from "typeorm";
import { GameType, Match } from "../entities/match.entity";
import { ChessMatch } from "../entities/chess-match.entity";
import { LeagueMatch } from "../entities/league-match.entity";

@Injectable()
export class DeleteMatchCommand {
    constructor(private dataSource: DataSource) {}

    async execute(id: number): Promise<void> {
        const match = await this.dataSource.getRepository(Match).findOneBy({ id });
        if (!match) throw new NotFoundException('Match not found');

        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            // 1. Delete the specialized game data
            const gameRepo = match.game_type === GameType.CHESS ? ChessMatch : LeagueMatch;
            await queryRunner.manager.delete(gameRepo, match.game_match_id);

            // 2. Delete the base match (UserMatches will cascade delete)
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