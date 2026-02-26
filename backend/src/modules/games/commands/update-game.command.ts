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

        if (dto.name !== undefined) game.name = dto.name;
        if (dto.team_count !== undefined) game.teamCount = dto.team_count;
        if (dto.team_size !== undefined) game.teamSize = dto.team_size;
        
        return await this.gameRepo.save(game);
    }
}