import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Match, GameType } from '../entities/match.entity';
import { ChessMatch } from '../entities/chess-match.entity';
import { LeagueMatch } from '../entities/league-match.entity';

@Injectable()
export class GetMatchDetailsQuery {
    constructor(private dataSource: DataSource) {}

    async execute(matchId: number) {
        // 1. Fetch the match and include all participants (UserMatch)
        const match = await this.dataSource.getRepository(Match).findOne({
            where: { id: matchId },
            relations: ['userMatches', 'userMatches.user'],
        });

        if (!match) {
            throw new NotFoundException(`Match with ID ${matchId} not found`);
        }

        // 2. Fetch the polymorphic game details
        const repo = match.game_type === GameType.CHESS ? ChessMatch : LeagueMatch;
        const details = await this.dataSource.getRepository(repo).findOneBy({ 
            id: match.game_match_id 
        });

        return {
            ...match,
            details,
        };
    }
}