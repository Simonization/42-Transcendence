import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Match } from './entities/match.entity';
import { UserMatch } from './entities/user-match.entity';

import { MatchesService } from './matches.service';
import { MatchesController } from './matches.controller';
import { MatchFlowService } from './services/match-flow.service';

// Commands
import { CreateMatchCommand } from './commands/create-match.command';
import { DeleteMatchCommand } from './commands/delete-match.command';

// Queries
import { GetPlayerHistoryQuery } from './queries/get-player-history.query';
import { GetMatchDetailsQuery } from './queries/get-match-details.query';

// External Modules
import { TournamentsModule } from '../tournaments/tournaments.module';
import { TeamsModule } from '../teams/teams.module';
import { ChatModule } from '../chat/chat.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([Match, UserMatch]),
        forwardRef(() => TournamentsModule),
        TeamsModule,
        ChatModule,
    ],
    controllers: [MatchesController],
    providers: [
        MatchesService,
        MatchFlowService,
        CreateMatchCommand,
        DeleteMatchCommand,
        GetPlayerHistoryQuery,
        GetMatchDetailsQuery,
    ],
    exports: [MatchesService, CreateMatchCommand],
})
export class MatchesModule {}
