import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Game } from '../entities/game.entity';

@Injectable()
export class GetAllGamesQuery {
    constructor(
        @InjectRepository(Game)
        private readonly gameRepo: Repository<Game>,
    ) {}

    async execute(): Promise<Game[]> {
        return await this.gameRepo.find({
            order: {
                name: 'ASC',
            },
        });
    }
}