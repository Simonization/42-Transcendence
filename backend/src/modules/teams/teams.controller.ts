import { Controller, Post, Body, UseGuards, Req, Patch, Param, ParseIntPipe, Get, Query, Delete } from '@nestjs/common';
import { TeamsService } from './teams.service';
import { CreateTeamDto } from './dto/create-team.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { InviteMemberDto, KickMemberDto, SetAdminDto, TransferCaptainDto } from './dto/manage-member.dto';
import { RenameTeamDto } from './dto/rename-team.dto';
import { JoinByCodeDto } from './dto/join-code.dto';
import { CreateJoinRequestDto } from './dto/join-request.dto';
import { LookingForTeamDto } from './dto/looking-for-team.dto';
import { ADMIN_ROLE, SUPER_ADMIN_ROLE } from '../users/constants/user-roles';

@Controller('teams')
export class TeamsController {
    constructor(private readonly teamsService: TeamsService) {}

    @Post()
    @UseGuards(JwtAuthGuard)
    async create(@Body() createTeamDto: CreateTeamDto, @Req() req) {
        return await this.teamsService.create(createTeamDto, req.user);
    }

    /** A team's page: roster, tournament, match results and placement. Any logged-in user. */
    @Get(':id/profile')
    @UseGuards(JwtAuthGuard)
    async getProfile(@Param('id', ParseIntPipe) id: number) {
        return await this.teamsService.getProfile(id);
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

    /**
     * Checks a LOCKED team in while the tournament's check-in window is open. Captain or team
     * admin; a global admin can check any team in.
     */
    @Post(':id/check-in')
    @UseGuards(JwtAuthGuard)
    async checkIn(@Param('id', ParseIntPipe) id: number, @Req() req) {
        const asAdmin = req.user.role === ADMIN_ROLE || req.user.role === SUPER_ADMIN_ROLE;
        return await this.teamsService.checkIn(id, req.user.id, asAdmin);
    }

    /** Grants admin rights to a member. Captain or an existing admin. */
    @Patch(':id/promote')
    @UseGuards(JwtAuthGuard)
    async promote(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: SetAdminDto,
        @Req() req,
    ) {
        return await this.teamsService.promote(id, dto.userId, req.user.id);
    }

    /** Revokes admin rights. The captain can demote anyone; an admin can only step down. */
    @Patch(':id/demote')
    @UseGuards(JwtAuthGuard)
    async demote(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: SetAdminDto,
        @Req() req,
    ) {
        return await this.teamsService.demote(id, dto.userId, req.user.id);
    }

    /** Returns pending invitations for a team. Members only. */
    @Get(':id/pending-invitations')
    @UseGuards(JwtAuthGuard)
    async getPendingInvitations(@Param('id', ParseIntPipe) id: number, @Req() req) {
        return await this.teamsService.getTeamPendingInvitations(id, req.user.id);
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

    /** Renames a team before the tournament starts. Captain or admin. */
    @Patch(':id/rename')
    @UseGuards(JwtAuthGuard)
    async rename(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: RenameTeamDto,
        @Req() req,
    ) {
        return await this.teamsService.rename(id, dto.name, req.user.id);
    }

    /** Takes a LOCKED team back to DRAFT while registration is open. Captain or admin. */
    @Patch(':id/unlock')
    @UseGuards(JwtAuthGuard)
    async unlock(@Param('id', ParseIntPipe) id: number, @Req() req) {
        return await this.teamsService.unlock(id, req.user.id);
    }

    /** Hands the captaincy to another member; the old captain becomes an admin. Captain only. */
    @Patch(':id/transfer-captain')
    @UseGuards(JwtAuthGuard)
    async transferCaptain(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: TransferCaptainDto,
        @Req() req,
    ) {
        return await this.teamsService.transferCaptaincy(id, dto.userId, req.user.id);
    }

    /** The team's invite code. Members only. */
    @Get(':id/join-code')
    @UseGuards(JwtAuthGuard)
    async getJoinCode(@Param('id', ParseIntPipe) id: number, @Req() req) {
        return await this.teamsService.getJoinCode(id, req.user.id);
    }

    /** Invalidates the old code and issues a new one. Captain or admin. */
    @Patch(':id/join-code/regenerate')
    @UseGuards(JwtAuthGuard)
    async regenerateJoinCode(@Param('id', ParseIntPipe) id: number, @Req() req) {
        return await this.teamsService.regenerateJoinCode(id, req.user.id);
    }

    /** Joins a team directly with its invite code. Any logged-in user. */
    @Post('join')
    @UseGuards(JwtAuthGuard)
    async joinByCode(@Body() dto: JoinByCodeDto, @Req() req) {
        return await this.teamsService.joinByCode(dto.code, req.user.id);
    }

    /** Asks to join a team. Any logged-in user. */
    @Post(':id/requests')
    @UseGuards(JwtAuthGuard)
    async requestToJoin(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: CreateJoinRequestDto,
        @Req() req,
    ) {
        return await this.teamsService.requestToJoin(id, req.user.id, dto.note);
    }

    /** Pending join requests for a team. Captain or admin. */
    @Get(':id/requests')
    @UseGuards(JwtAuthGuard)
    async getJoinRequests(@Param('id', ParseIntPipe) id: number, @Req() req) {
        return await this.teamsService.getJoinRequests(id, req.user.id);
    }

    /** Accepts a join request. Captain or admin of the team it targets. */
    @Patch('requests/:id/accept')
    @UseGuards(JwtAuthGuard)
    async acceptJoinRequest(@Param('id', ParseIntPipe) id: number, @Req() req) {
        return await this.teamsService.acceptJoinRequest(id, req.user.id);
    }

    /** Declines a join request. Captain or admin of the team it targets. */
    @Patch('requests/:id/decline')
    @UseGuards(JwtAuthGuard)
    async declineJoinRequest(@Param('id', ParseIntPipe) id: number, @Req() req) {
        return await this.teamsService.declineJoinRequest(id, req.user.id);
    }

    /** Cancels a pending invitation (team captain/admin) or one's own join request (requester). */
    @Delete('invitations/:id')
    @UseGuards(JwtAuthGuard)
    async cancelInvitation(@Param('id', ParseIntPipe) id: number, @Req() req) {
        return await this.teamsService.cancelInvitation(id, req.user.id);
    }

    /** Registration capacity of a tournament (locked teams vs max_participants). */
    @Get('tournament/:tournamentId/availability')
    @UseGuards(JwtAuthGuard)
    async getAvailability(@Param('tournamentId', ParseIntPipe) tournamentId: number) {
        return await this.teamsService.getTournamentAvailability(tournamentId);
    }

    /** Looking-for-team board for a tournament. Any logged-in user. */
    @Get('lft/:tournamentId')
    @UseGuards(JwtAuthGuard)
    async listLookingForTeam(@Param('tournamentId', ParseIntPipe) tournamentId: number) {
        return await this.teamsService.listLookingForTeam(tournamentId);
    }

    /** Flags the caller as looking for a team (or updates their note). */
    @Post('lft/:tournamentId')
    @UseGuards(JwtAuthGuard)
    async flagLookingForTeam(
        @Param('tournamentId', ParseIntPipe) tournamentId: number,
        @Body() dto: LookingForTeamDto,
        @Req() req,
    ) {
        return await this.teamsService.flagLookingForTeam(tournamentId, req.user.id, dto.note);
    }

    /** Removes the caller from the looking-for-team board. */
    @Delete('lft/:tournamentId')
    @UseGuards(JwtAuthGuard)
    async unflagLookingForTeam(
        @Param('tournamentId', ParseIntPipe) tournamentId: number,
        @Req() req,
    ) {
        return await this.teamsService.unflagLookingForTeam(tournamentId, req.user.id);
    }
}
