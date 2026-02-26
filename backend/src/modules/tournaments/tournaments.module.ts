import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tournament } from './entities/tournament.entity';
import { TournamentPhase } from './entities/tournament-phase.entity';
import { TournamentsController } from './tournaments.controller';
import { TournamentsService } from './tournaments.service';

// Services & Generators
import { PhaseService } from './services/phase.service';
import { BracketGeneratorService } from './services/bracket-generator.service';

// Commands & Queries
import { CreateTournamentCommand } from './commands/create-tournament.command';
import { UpdateTournamentCommand } from './commands/update-tournament.command';
import { DeleteTournamentCommand } from './commands/delete-tournament.command';
import { StartTournamentCommand } from './commands/start-tournament.command';
import { GetAllTournamentsQuery } from './queries/get-all-tournaments.query';
import { GetTournamentQuery } from './queries/get-tournament-details.query';

// External Modules
import { GamesModule } from '../games/games.module';
import { MatchesModule } from '../matches/matches.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([Tournament, TournamentPhase]),
        GamesModule,
        forwardRef(() => MatchesModule),
    ],
    controllers: [TournamentsController],
    providers: [
        TournamentsService,
        PhaseService,
        BracketGeneratorService,
        
        // Commands
        CreateTournamentCommand,
        UpdateTournamentCommand,
        DeleteTournamentCommand,
        StartTournamentCommand, 
        
        // Queries
        GetAllTournamentsQuery,
        GetTournamentQuery,
    ],
    exports: [TournamentsService, PhaseService],
})
export class TournamentsModule {}