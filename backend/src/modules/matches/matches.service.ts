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
import { MatchChatService } from '../chat/services/match-chat.service';
import { publicMatch } from '../users/public-views';

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
        private readonly matchChat: MatchChatService,
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

    /** Member of either team: the chat of this match (created if missing), joined if needed. */
    openChat(id: number, userId: number) {
        return this.matchChat.openForMember(id, userId);
    }

    async findOne(id: number) {
        return publicMatch(await this.getMatchDetailsQuery.execute(id));
    }

    async getHistory(userId: number) {
        return (await this.getPlayerHistoryQuery.execute(userId)).map(publicMatch);
    }

    async findByPhase(phaseId: number) {
        const matches = await this.repo.find({
            where: { phase_id: phaseId },
            relations: ['team1', 'team2', 'userMatches', 'userMatches.user'],
            order: { round_order: 'ASC', id: 'ASC' }
        });
        return matches.map(publicMatch);
    }
}
