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

    async execute(userId: number): Promise<Match[]> {
        return await this.matchRepo.find({
            where: {
                userMatches: { user_id: userId }
            },
            relations: [
                'teams',
                'phase',
                'phase.tournament',
                'userMatches',
                'userMatches.user',  // ← THE FIX: load user on every participant
            ],
            order: {
                created_at: 'DESC',
            },
        });
    }
}