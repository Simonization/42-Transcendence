import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Match } from './entities/match.entity';
import { ChessMatch } from './entities/chess-match.entity';
import { LeagueMatch } from './entities/league-match.entity';
import { UserMatch } from './entities/user-match.entity';

import { MatchesService } from './matches.service';
import { MatchesController } from './matches.controller';

// Commands
import { CreateMatchCommand } from './commands/create-match.command';
import { UpdateMatchCommand } from './commands/update-match.command';
import { DeleteMatchCommand } from './commands/delete-match.command';

// Queries
import { GetPlayerHistoryQuery } from './queries/get-player-history.query';
import { GetMatchDetailsQuery } from './queries/get-match-details.query';

@Module({
    imports: [
        TypeOrmModule.forFeature([Match, ChessMatch, LeagueMatch, UserMatch]),
    ],
    controllers: [MatchesController],
    providers: [
        MatchesService,
        CreateMatchCommand,
        UpdateMatchCommand,
        DeleteMatchCommand,
        GetPlayerHistoryQuery,
        GetMatchDetailsQuery,
    ],
    exports: [MatchesService],
})
export class MatchesModule {}