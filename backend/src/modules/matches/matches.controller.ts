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
    Req
} from '@nestjs/common';
import { MatchesService } from './matches.service';
import { CreateMatchDto } from './dto/create-match.dto';
import { UpdateMatchDto } from './dto/update-match.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('matches')
@UseGuards(JwtAuthGuard) // Protects all routes in this controller
export class MatchesController {
    constructor(private readonly matchesService: MatchesService) {}

    @Post()
    async create(@Body() dto: CreateMatchDto) {
        return await this.matchesService.create(dto);
    }

    @Get('my-history')
    async getMyHistory(@Req() req) {
        // req.user is populated by the JwtAuthGuard
        return await this.matchesService.getHistory(req.user.id);
    }

    @Get('history/:userId')
    async getPlayerHistory(@Param('userId', ParseIntPipe) userId: number) {
        return await this.matchesService.getHistory(userId);
    }

    @Get('phase/:phaseId')
    async getByPhase(@Param('phaseId', ParseIntPipe) phaseId: number) {
        return await this.matchesService.findByPhase(phaseId);
    }

    @Get(':id')
    async getOne(@Param('id', ParseIntPipe) id: number) {
        return await this.matchesService.findOne(id);
    }

    @Patch(':id')
    async update(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UpdateMatchDto,
    ) {
        return await this.matchesService.update(id, dto);
    }

    @Delete(':id')
    async remove(@Param('id', ParseIntPipe) id: number) {
        return await this.matchesService.delete(id);
    }
}