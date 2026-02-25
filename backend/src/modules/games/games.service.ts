import { Injectable } from '@nestjs/common';
import { CreateGameCommand } from './commands/create-game.command';
import { UpdateGameCommand } from './commands/update-game.command';
import { DeleteGameCommand } from './commands/delete-game.command';
import { GetGameDetailsQuery } from './queries/get-game-details.query';
import { GetAllGamesQuery } from './queries/get-all-games.query';
import { CreateGameDto } from './dto/create-game.dto';
import { UpdateGameDto } from './dto/update-game.dto';

@Injectable()
export class GamesService {
  constructor(
    private readonly createCmd: CreateGameCommand,
    private readonly updateCmd: UpdateGameCommand,
    private readonly deleteCmd: DeleteGameCommand,
    private readonly detailsQuery: GetGameDetailsQuery,
    private readonly getAllQuery: GetAllGamesQuery,
  ) {}

  create(dto: CreateGameDto) {
    return this.createCmd.execute(dto);
  }

  update(id: number, dto: UpdateGameDto) {
    return this.updateCmd.execute(id, dto);
  }

  remove(id: number) {
    return this.deleteCmd.execute(id);
  }

  findOne(id: number) {
    return this.detailsQuery.execute(id);
  }

  findAll() {
    return this.getAllQuery.execute();
  }
}