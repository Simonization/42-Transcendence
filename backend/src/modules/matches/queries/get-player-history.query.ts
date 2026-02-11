import { Injectable } from "@nestjs/common";
import { DataSource } from "typeorm";
import { GameType, Match } from "../entities/match.entity";
import { ChessMatch } from "../entities/chess-match.entity";
import { LeagueMatch } from "../entities/league-match.entity";

@Injectable()
export class GetPlayerHistoryQuery {
    constructor(private dataSource: DataSource) {}

    async execute(userId: number) {
        const matches = await this.dataSource.getRepository(Match).createQueryBuilder('match')
            .innerJoinAndSelect('match.userMatches', 'um')
            .where('um.user_id = :userId', { userId })
            .orderBy('match.created_at', 'DESC')
            .getMany();

        return Promise.all(matches.map(async (match) => {
            const repo = match.game_type === GameType.CHESS ? ChessMatch : LeagueMatch;
            const details = await this.dataSource.getRepository(repo).findOneBy({ id: match.game_match_id });
            return { ...match, details };
        }));
    }
}