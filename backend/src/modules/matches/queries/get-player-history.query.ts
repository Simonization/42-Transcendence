// src/modules/matches/queries/get-player-history.query.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Match } from '../entities/match.entity';

@Injectable()
export class GetPlayerHistoryQuery {
    constructor(
        @InjectRepository(Match)
        private readonly matchRepo: Repository<Match>,
    ) {}

    /**
     * Matches the user played: tournament matches of any team they are a member of (through the
     * two slots), plus legacy matches that list them in users_matches.
     */
    async execute(userId: number): Promise<Match[]> {
        return await this.matchRepo
            .createQueryBuilder('m')
            .leftJoinAndSelect('m.team1', 't1')
            .leftJoinAndSelect('t1.members', 't1m')
            .leftJoinAndSelect('m.team2', 't2')
            .leftJoinAndSelect('t2.members', 't2m')
            .leftJoinAndSelect('m.game', 'game')
            .leftJoinAndSelect('m.phase', 'phase')
            .leftJoinAndSelect('phase.game', 'phaseGame')
            .leftJoinAndSelect('phase.tournament', 'tournament')
            .leftJoinAndSelect('m.userMatches', 'um')
            .leftJoinAndSelect('um.user', 'umUser')
            .where(
                `m.id IN (
                    SELECT mm.id FROM matches mm
                    JOIN team_members tm ON tm.team_id IN (mm.team1_id, mm.team2_id)
                    WHERE tm.user_id = :userId
                    UNION
                    SELECT um2.match_id FROM users_matches um2 WHERE um2.user_id = :userId
                )`,
                { userId },
            )
            .orderBy('m.created_at', 'DESC')
            .getMany();
    }
}
