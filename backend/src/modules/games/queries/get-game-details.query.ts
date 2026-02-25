import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Game } from '../entities/game.entity';

@Injectable()
export class GetGameDetailsQuery {
    constructor(@InjectRepository(Game) private gameRepo: Repository<Game>) {}

    async execute(id: number) {
        const game = await this.gameRepo.findOneBy({ id });
        if (!game) throw new NotFoundException('Game configuration not found');
        return game;
    }
}