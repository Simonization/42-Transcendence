import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Match } from '../entities/match.entity';

@Injectable()
export class GetMatchDetailsQuery {
    constructor(
        @InjectRepository(Match)
        private readonly matchRepo: Repository<Match>,
    ) {}

    async execute(id: number): Promise<Match> {
        const match = await this.matchRepo.findOne({
            where: { id },
            relations: [
                'teams',
                'userMatches',
                'userMatches.user',
                'phase',
                'phase.tournament',
            ],
        });

        if (!match) {
            throw new NotFoundException(`Match with ID ${id} not found`);
        }

        return match;
    }
}