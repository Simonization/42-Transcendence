import { Injectable } from '@nestjs/common';
import { CreateMatchCommand } from './commands/create-match.command';
import { DeleteMatchCommand } from './commands/delete-match.command';
import { GetPlayerHistoryQuery } from './queries/get-player-history.query';
import { GetMatchDetailsQuery } from './queries/get-match-details.query';
import { CreateMatchDto } from './dto/create-match.dto';
import { UpdateMatchDto } from './dto/update-match.dto';
import { ReportScoreDto } from './dto/report-score.dto';
import { MatchFlowService } from './services/match-flow.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Match } from './entities/match.entity';
import { Repository } from 'typeorm';

@Injectable()
export class MatchesService {
    constructor(
        private readonly createCmd: CreateMatchCommand,
        private readonly deleteCmd: DeleteMatchCommand,
        private readonly flow: MatchFlowService,
        private readonly getMatchDetailsQuery: GetMatchDetailsQuery,
        private readonly getPlayerHistoryQuery: GetPlayerHistoryQuery,
        @InjectRepository(Match)
        private readonly repo: Repository<Match>,
    ) {}

    create(dto: CreateMatchDto) {
        return this.createCmd.execute(dto);
    }

    update(id: number, dto: UpdateMatchDto) {
        return this.flow.adminUpdate(id, dto);
    }

    delete(id: number) {
        return this.deleteCmd.execute(id);
    }

    report(id: number, userId: number, dto: ReportScoreDto) {
        return this.flow.report(id, userId, dto);
    }

    confirm(id: number, userId: number) {
        return this.flow.confirm(id, userId);
    }

    dispute(id: number, userId: number) {
        return this.flow.dispute(id, userId);
    }

    resolve(id: number, dto: ReportScoreDto) {
        return this.flow.resolve(id, dto);
    }

    undo(id: number) {
        return this.flow.undo(id);
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
            relations: ['team1', 'team2', 'userMatches', 'userMatches.user'],
            order: { round_order: 'ASC', id: 'ASC' }
        });
    }
}
