import { 
    Controller, 
    Get, 
    Post, 
    Body, 
    Patch, 
    Param, 
    Delete, 
    ParseIntPipe, 
    UseGuards 
} from '@nestjs/common';
import { GamesService } from './games.service';
import { CreateGameDto } from './dto/create-game.dto';
import { UpdateGameDto } from './dto/update-game.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('games')
export class GamesController {
    constructor(private readonly gamesService: GamesService) {}

    /**
     * CREATE: Add a new game configuration (e.g., Valorant, 5v5)
     * POST /games
     */
    @UseGuards(JwtAuthGuard) // Usually restricted to Admins later
    @Post()
    async create(@Body() createGameDto: CreateGameDto) {
        return await this.gamesService.create(createGameDto);
    }

    /**
     * READ: Get list of all supported games
     * GET /games
     */
    @Get()
    async findAll() {
        return await this.gamesService.findAll();
    }

    /**
     * READ: Get specific game rules/info
     * GET /games/:id
     */
    @Get(':id')
    async findOne(@Param('id', ParseIntPipe) id: number) {
        return await this.gamesService.findOne(id);
    }

    /**
     * UPDATE: Change game settings (e.g., update team size)
     * PATCH /games/:id
     */
    @UseGuards(JwtAuthGuard)
    @Patch(':id')
    async update(
        @Param('id', ParseIntPipe) id: number, 
        @Body() updateGameDto: UpdateGameDto
    ) {
        return await this.gamesService.update(id, updateGameDto);
    }

    /**
     * DELETE: Remove a game type
     * DELETE /games/:id
     */
    @UseGuards(JwtAuthGuard)
    @Delete(':id')
    async remove(@Param('id', ParseIntPipe) id: number) {
        return await this.gamesService.remove(id);
    }
}