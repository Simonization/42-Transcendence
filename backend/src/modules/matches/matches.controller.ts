import { 
    Controller, 
    Get, 
    Post, 
    Patch, 
    Delete, 
    Body, 
    Param, 
    ParseIntPipe, 
    UseGuards, 
    Query,
    Req
} from '@nestjs/common';
import { MatchesService } from './matches.service';
import { CreateMatchDto } from './dto/create-match.dto';
import { UpdateMatchDto } from './dto/update-match.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('matches')
@UseGuards(JwtAuthGuard)
export class MatchesController {
    constructor(private readonly matchesService: MatchesService) {}

    /**
     * CREATE: Create a new match (Chess or League)
     * POST /matches
     */
    @Post()
    async createMatch(@Body() dto: CreateMatchDto) {
        return await this.matchesService.create(dto);
    }

    /**
     * QUERY: Get specific match details by ID
     * GET /matches/:id
     */
    @Get(':id')
    async getMatchDetails(@Param('id', ParseIntPipe) id: number) {
        return await this.matchesService.getMatch(id);
    }

    /**
     * QUERY: Get match history for a specific player
     * GET /matches/history/:userId
     */
    @Get('history/:userId')
    async getPlayerHistory(@Param('userId', ParseIntPipe) userId: number) {
        return await this.matchesService.getHistory(userId);
    }

    /**
     * QUERY: Get history for the currently logged-in user
     * GET /matches/my-history
     */
    @Get('my-history')
    async getMyHistory(@Req() req) {
        // req.user is populated by the JwtAuthGuard
        return await this.matchesService.getHistory(req.user.id);
    }

    /**
     * UPDATE: Update match metadata or game data
     * PATCH /matches/:id
     */
    @Patch(':id')
    async updateMatch(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UpdateMatchDto,
    ) {
        return await this.matchesService.update(id, dto);
    }

    /**
     * DELETE: Remove a match and its polymorphic details
     * DELETE /matches/:id
     */
    @Delete(':id')
    async deleteMatch(@Param('id', ParseIntPipe) id: number) {
        return await this.matchesService.delete(id);
    }
}