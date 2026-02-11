import { Injectable } from '@nestjs/common';
import { CreateMatchCommand } from './commands/create-match.command';
import { DeleteMatchCommand } from './commands/delete-match.command';
import { UpdateMatchCommand } from './commands/update-match.command';
import { GetPlayerHistoryQuery } from './queries/get-player-history.query';
import { GetMatchDetailsQuery } from './queries/get-match-details.query';
import { CreateMatchDto } from './dto/create-match.dto';
import { UpdateMatchDto } from './dto/update-match.dto';

@Injectable()
export class MatchesService {
    constructor(
        private readonly createCmd: CreateMatchCommand,
        private readonly deleteCmd: DeleteMatchCommand,
        private readonly updateCmd: UpdateMatchCommand,
        private readonly historyQuery: GetPlayerHistoryQuery,
        private readonly matchQuery: GetMatchDetailsQuery
    ) {}

    // Command delegates
    create(dto: CreateMatchDto) { return this.createCmd.execute(dto); }
    update(id: number, dto: UpdateMatchDto) { return this.updateCmd.execute(id, dto); }
    delete(id: number) { return this.deleteCmd.execute(id); }

    // Query delegates
    getHistory(userId: number) { return this.historyQuery.execute(userId); }
    getMatch(id: number) { return this.matchQuery.execute(id); }
}