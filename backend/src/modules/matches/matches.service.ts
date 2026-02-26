import { Injectable } from '@nestjs/common';
import { CreateMatchCommand } from './commands/create-match.command';
import { DeleteMatchCommand } from './commands/delete-match.command';
import { UpdateMatchCommand } from './commands/update-match.command';
import { GetPlayerHistoryQuery } from './queries/get-player-history.query';
import { GetMatchDetailsQuery } from './queries/get-match-details.query';
import { CreateMatchDto } from './dto/create-match.dto';
import { UpdateMatchDto } from './dto/update-match.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Match } from './entities/match.entity';
import { Repository } from 'typeorm';

@Injectable()
export class MatchesService {
    constructor(
        private readonly createCmd: CreateMatchCommand,
        private readonly updateCmd: UpdateMatchCommand,
        private readonly deleteCmd: DeleteMatchCommand,
        private readonly getMatchDetailsQuery: GetMatchDetailsQuery,
        private readonly getPlayerHistoryQuery: GetPlayerHistoryQuery,
        @InjectRepository(Match)
        private readonly repo: Repository<Match>,
    ) {}

    create(dto: CreateMatchDto) {
        return this.createCmd.execute(dto);
    }

    update(id: number, dto: UpdateMatchDto) {
        return this.updateCmd.execute(id, dto);
    }

    delete(id: number) {
        return this.deleteCmd.execute(id);
    }

    async findOne(id: number) {
        return await this.getMatchDetailsQuery.execute(id);
    }

    async getHistory(userId: number) {
        return await this.getPlayerHistoryQuery.execute(userId);
    }

    async findByPhase(phaseId: number): Promise<Match[]> {
        return await this.repo.find({
            where: { phase_id: phaseId },
            relations: ['teams', 'userMatches', 'userMatches.user'],
            order: { created_at: 'ASC' }
        });
    }
}