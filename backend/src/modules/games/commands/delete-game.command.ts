import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Game } from '../entities/game.entity';

@Injectable()
export class DeleteGameCommand {
    constructor(
        @InjectRepository(Game) private readonly gameRepo: Repository<Game>,
    ) {}

    async execute(id: number): Promise<void> {
        const result = await this.gameRepo.delete(id);

        if (result.affected === 0) {
            throw new NotFoundException(`Game with ID ${id} not found`);
        }
    }
}