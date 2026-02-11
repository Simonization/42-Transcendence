import { Injectable } from "@nestjs/common";
import { DataSource } from "typeorm";
import { CreateMatchDto } from "../dto/create-match.dto";
import { GameType, Match } from "../entities/match.entity";
import { ChessMatch } from "../entities/chess-match.entity";
import { LeagueMatch } from "../entities/league-match.entity";
import { UserMatch } from "../entities/user-match.entity";

@Injectable()
export class CreateMatchCommand {
    constructor(private dataSource: DataSource) {}

    async execute(dto: CreateMatchDto): Promise<Match> {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            let gameMatchId: number;

            // 1. Create Game-Specific Metadata
            if (dto.game_type === GameType.CHESS) {
                const chess = queryRunner.manager.create(ChessMatch, dto.game_data);
                const saved = await queryRunner.manager.save(chess);
                gameMatchId = saved.id;
            } else {
                const league = queryRunner.manager.create(LeagueMatch, { data: dto.game_data });
                const saved = await queryRunner.manager.save(league);
                gameMatchId = saved.id;
            }

            // 2. Create Base Match
            const match = queryRunner.manager.create(Match, {
                game_type: dto.game_type,
                game_match_id: gameMatchId,
                tournament_id: dto.tournament_id,
            });
            const savedMatch = await queryRunner.manager.save(match);

            // 3. Create User-Match Junctions (Accounts for Teams)
            const participants = dto.participants.map((p) => 
                queryRunner.manager.create(UserMatch, {
                    match: savedMatch,
                    user: { id: p.userId },
                    team_id: p.teamId,
                    result: p.result,
                })
            );
            await queryRunner.manager.save(UserMatch, participants);

            await queryRunner.commitTransaction();
            return savedMatch;
        } catch (err) {
            await queryRunner.rollbackTransaction();
            throw err;
        } finally {
            await queryRunner.release();
        }
    }
}