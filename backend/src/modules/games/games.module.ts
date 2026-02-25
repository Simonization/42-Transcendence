import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GamesController } from './games.controller';
import { GamesService } from './games.service';
import { Game } from './entities/game.entity';

// Import all your Commands and Queries
import { CreateGameCommand } from './commands/create-game.command';
import { UpdateGameCommand } from './commands/update-game.command';
import { DeleteGameCommand } from './commands/delete-game.command';
import { GetAllGamesQuery } from './queries/get-all-games.query';
import { GetGameDetailsQuery } from './queries/get-game-details.query';

@Module({
    imports: [
        TypeOrmModule.forFeature([Game]),
    ],
    controllers: [GamesController],
    providers: [
        GamesService,
        CreateGameCommand,
        UpdateGameCommand,
        DeleteGameCommand,
        GetAllGamesQuery,
        GetGameDetailsQuery,
    ],
    exports: [GamesService],
})
export class GamesModule {}