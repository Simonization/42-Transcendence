import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tournament } from './entities/tournament.entity';
import { TournamentPhase } from './entities/tournament-phase.entity';
import { TournamentsController } from './tournaments.controller';
import { TournamentsService } from './tournaments.service';

// Commands & Queries
import { CreateTournamentCommand } from './commands/create-tournament.command';
import { UpdateTournamentCommand } from './commands/update-tournament.command';
import { DeleteTournamentCommand } from './commands/delete-tournament.command';
import { GetAllTournamentsQuery } from './queries/get-all-tournaments.query';
import { GetTournamentQuery } from './queries/get-tournament-details.query';
import { GamesModule } from '../games/games.module';

@Module({
    imports: [
        // Register entities for this module
        TypeOrmModule.forFeature([Tournament, TournamentPhase]),
        // Import GamesModule to access Game entity/repository if needed
        GamesModule,
    ],
    controllers: [TournamentsController],
    providers: [
        TournamentsService,
        CreateTournamentCommand,
        UpdateTournamentCommand,
        DeleteTournamentCommand,
        GetAllTournamentsQuery,
        GetTournamentQuery,
    ],
    exports: [TournamentsService],
})
export class TournamentsModule {}