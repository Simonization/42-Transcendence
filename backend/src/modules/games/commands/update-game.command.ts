import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Game } from '../entities/game.entity';
import { UpdateGameDto } from '../dto/update-game.dto';

@Injectable()
export class UpdateGameCommand {
    constructor(
        @InjectRepository(Game) private readonly gameRepo: Repository<Game>,
    ) {}

    async execute(id: number, dto: UpdateGameDto): Promise<Game> {
        const game = await this.gameRepo.findOneBy({ id });
        
        if (!game) {
            throw new NotFoundException(`Game with ID ${id} not found`);
        }

        // Merge the new changes into the existing game entity
        Object.assign(game, dto);
        
        return await this.gameRepo.save(game);
    }
}