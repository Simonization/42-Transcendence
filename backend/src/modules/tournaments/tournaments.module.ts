import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tournament } from './entities/tournament.entity';
import { TournamentPhase } from './entities/tournament-phase.entity';
import { TournamentsController } from './tournaments.controller';
import { TournamentsService } from './tournaments.service';

// Services & Generators
import { BracketGeneratorService } from './services/bracket-generator.service';
import { BracketEngine } from './services/bracket-engine.service';
import { MatchNotifier } from './services/match-notifier.service';

// Commands & Queries
import { CreateTournamentCommand } from './commands/create-tournament.command';
import { UpdateTournamentCommand } from './commands/update-tournament.command';
import { DeleteTournamentCommand } from './commands/delete-tournament.command';
import { StartTournamentCommand } from './commands/start-tournament.command';
import { SetSeedingCommand } from './commands/set-seeding.command';
import { WithdrawTeamCommand } from './commands/withdraw-team.command';
import { GetAllTournamentsQuery } from './queries/get-all-tournaments.query';
import { GetTournamentQuery } from './queries/get-tournament-details.query';
import { GetSeedingQuery } from './queries/get-seeding.query';
import { GetPublicTournamentQuery } from './public/get-public-tournament.query';
import { OgImageService } from './public/og-image.service';
import { PublicTournamentsController, ShareController } from './public/public-tournaments.controller';

// External Modules
import { GamesModule } from '../games/games.module';
import { MatchesModule } from '../matches/matches.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { Match } from '../matches/entities/match.entity';
import { Team } from '../teams/entities/team.entity';
import { TeamAdmin } from '../teams/entities/team-admin.entity';
import { TeamInvitation } from '../teams/entities/team-invitation.entity';
import { User } from '../users/entities/user.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([Tournament, TournamentPhase, Match, Team, TeamAdmin, TeamInvitation, User]),
        GamesModule,
        forwardRef(() => MatchesModule),
        NotificationsModule,
    ],
    controllers: [TournamentsController, PublicTournamentsController, ShareController],
    providers: [
        TournamentsService,
        BracketGeneratorService,
        BracketEngine,
        MatchNotifier,

        // Commands
        CreateTournamentCommand,
        UpdateTournamentCommand,
        DeleteTournamentCommand,
        StartTournamentCommand,
        SetSeedingCommand,
        WithdrawTeamCommand,

        // Queries
        GetAllTournamentsQuery,
        GetTournamentQuery,
        GetSeedingQuery,
        GetPublicTournamentQuery,
        OgImageService,
    ],
    exports: [TournamentsService, BracketEngine, MatchNotifier],
})
export class TournamentsModule {}
