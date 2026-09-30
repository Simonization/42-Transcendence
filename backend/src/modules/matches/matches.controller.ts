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
    Req,
    HttpCode,
} from '@nestjs/common';
import { MatchesService } from './matches.service';
import { CreateMatchDto } from './dto/create-match.dto';
import { UpdateMatchDto } from './dto/update-match.dto';
import { ReportScoreDto } from './dto/report-score.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

/**
 * Reads need a login. Writes are split: the match loop (report / confirm / dispute) is for the
 * captains and team admins of the two teams, checked per match; everything that edits a match
 * directly is for global admins.
 */
@Controller('matches')
@UseGuards(JwtAuthGuard)
export class MatchesController {
    constructor(private readonly matchesService: MatchesService) {}

    @Post()
    @UseGuards(AdminGuard)
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

    /** Member of either team: open (and join) the group chat of this match. */
    @Post(':id/chat')
    @HttpCode(200)
    async openChat(@Param('id', ParseIntPipe) id: number, @Req() req) {
        return await this.matchesService.openChat(id, req.user.id);
    }

    /** Captain / team admin of either team: report the score (slot order). */
    @Post(':id/report')
    @HttpCode(200)
    async report(@Param('id', ParseIntPipe) id: number, @Req() req, @Body() dto: ReportScoreDto) {
        return await this.matchesService.report(id, req.user.id, dto);
    }

    /** Captain / team admin of the team that did not report: accept the score. */
    @Post(':id/confirm')
    @HttpCode(200)
    async confirm(@Param('id', ParseIntPipe) id: number, @Req() req) {
        return await this.matchesService.confirm(id, req.user.id);
    }

    /** Captain / team admin of the team that did not report: reject the score. */
    @Post(':id/dispute')
    @HttpCode(200)
    async dispute(@Param('id', ParseIntPipe) id: number, @Req() req) {
        return await this.matchesService.dispute(id, req.user.id);
    }

    /** Global admin: set the final score from any unsettled state. */
    @Post(':id/resolve')
    @HttpCode(200)
    @UseGuards(AdminGuard)
    async resolve(@Param('id', ParseIntPipe) id: number, @Body() dto: ReportScoreDto) {
        return await this.matchesService.resolve(id, dto);
    }

    /** Global admin: revert a finished match, if its winner has not played on yet. */
    @Post(':id/undo')
    @HttpCode(200)
    @UseGuards(AdminGuard)
    async undo(@Param('id', ParseIntPipe) id: number) {
        return await this.matchesService.undo(id);
    }

    @Patch(':id')
    @UseGuards(AdminGuard)
    async update(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UpdateMatchDto,
    ) {
        return await this.matchesService.update(id, dto);
    }

    @Delete(':id')
    @UseGuards(AdminGuard)
    async remove(@Param('id', ParseIntPipe) id: number) {
        return await this.matchesService.delete(id);
    }
}
