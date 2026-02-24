import { Injectable } from "@nestjs/common";
import { Game } from "../entities/game.entity";
import { Repository } from "typeorm";
import { CreateGameDto } from "../dto/create-game.dto";
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class CreateGameCommand {
  constructor(@InjectRepository(Game) private gameRepo: Repository<Game>) {}

  async execute(dto: CreateGameDto): Promise<Game> {
    const game = this.gameRepo.create({
      name: dto.name,
      teamCount: dto.team_count,
      teamSize: dto.team_size
    });
    return await this.gameRepo.save(game);
  }
}