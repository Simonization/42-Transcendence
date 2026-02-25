import { Controller, Post, Body, UseGuards, Req, Patch, Param, ParseIntPipe, Get } from '@nestjs/common';
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

    @Get('invitations/my')
    @UseGuards(JwtAuthGuard)
    async getMyInvitations(@Req() req) {
        return await this.teamsService.getMyInvitations(req.user.id);
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