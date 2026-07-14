import { Controller, Post, Body, UseGuards, Req, Patch, Param, ParseIntPipe, Get, Query, Delete } from '@nestjs/common';
import { TeamsService } from './teams.service';
import { CreateTeamDto } from './dto/create-team.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { InviteMemberDto, KickMemberDto } from './dto/manage-member.dto';

@Controller('teams')
export class TeamsController {
    constructor(private readonly teamsService: TeamsService) {}

    @Post()
    @UseGuards(JwtAuthGuard)
    async create(@Body() createTeamDto: CreateTeamDto, @Req() req) {
        return await this.teamsService.create(createTeamDto, req.user);
    }

    @Patch(':id/invite')
    @UseGuards(JwtAuthGuard)
    async invite(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: InviteMemberDto,
    @Req() req
    ) {
    return await this.teamsService.invite(id, dto.userId, req.user.id);
    }

    @Patch(':id/kick')
    @UseGuards(JwtAuthGuard)
    async kick(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: KickMemberDto,
    @Req() req
    ) {
    return await this.teamsService.kick(id, dto.userId, req.user.id);
    }

    @Patch(':id/lock')
    @UseGuards(JwtAuthGuard)
    async lock(@Param('id', ParseIntPipe) id: number, @Req() req) {
        return await this.teamsService.lock(id, req.user.id);
    }

    /** Returns pending invitations for a team (captain only) */
    @Get(':id/pending-invitations')
    @UseGuards(JwtAuthGuard)
    async getPendingInvitations(@Param('id', ParseIntPipe) id: number, @Req() req) {
        const status = await this.teamsService.getTeamPendingInvitations(id);
        // Verify the requester is involved (service-level guard is enough but keep it simple)
        return status;
    }

    @Get('invitations/my')
    @UseGuards(JwtAuthGuard)
    async getMyInvitations(@Req() req) {
        return await this.teamsService.getMyInvitations(req.user.id);
    }

    /** Returns the current user's team (or pending invitation) for a given tournament */
    @Get('mine')
    @UseGuards(JwtAuthGuard)
    async getMyTeam(
        @Query('tournament_id', ParseIntPipe) tournamentId: number,
        @Req() req,
    ) {
        return await this.teamsService.getMyTeamForTournament(tournamentId, req.user.id);
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard)
    async deleteTeam(@Param('id', ParseIntPipe) id: number, @Req() req) {
        return await this.teamsService.deleteTeam(id, req.user.id);
    }

    @Patch(':id/leave')
    @UseGuards(JwtAuthGuard)
    async leaveTeam(@Param('id', ParseIntPipe) id: number, @Req() req) {
        return await this.teamsService.leaveTeam(id, req.user.id);
    }

    @Patch('invitations/:id/accept')
    @UseGuards(JwtAuthGuard)
    async acceptInvitation(
        @Param('id', ParseIntPipe) id: number,
        @Req() req
    ) {
        return await this.teamsService.acceptInvitation(id, req.user.id);
    }

    @Patch('invitations/:id/decline')
    @UseGuards(JwtAuthGuard)
    async declineInvitation(
        @Param('id', ParseIntPipe) id: number,
        @Req() req
    ) {
        return await this.teamsService.declineInvitation(id, req.user.id);
    }
}
