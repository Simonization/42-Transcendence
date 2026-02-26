import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Match } from './entities/match.entity';
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

// External Modules
import { TournamentsModule } from '../tournaments/tournaments.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([Match, UserMatch]),
        forwardRef(() => TournamentsModule),
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
    exports: [MatchesService, UpdateMatchCommand, CreateMatchCommand], 
})
export class MatchesModule {}