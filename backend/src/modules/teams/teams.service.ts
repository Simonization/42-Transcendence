import { Injectable } from '@nestjs/common';
import { CreateTeamCommand } from './commands/create-team.command';
import { CreateTeamDto } from './dto/create-team.dto';
import { User } from '../users/entities/user.entity';
import { KickPlayerCommand } from './commands/kick-player.command';
import { InvitePlayerCommand } from './commands/invite-player.command';
import { LockTeamCommand } from './commands/lock-team.command';
import { AcceptInvitationCommand } from './commands/accept-invitation.command';
import { DeclineInvitationCommand } from './commands/decline-invitation.command';
import { DeleteTeamCommand } from './commands/delete-team.command';
import { LeaveTeamCommand } from './commands/leave-team.command';
import { GetMyInvitationsQuery } from './queries/get-my-invitations.query';
import { GetMyTeamForTournamentQuery } from './queries/get-my-team-for-tournament.query';
import { SetAdminCommand } from './commands/set-admin.command';
import { RenameTeamCommand } from './commands/rename-team.command';
import { UnlockTeamCommand } from './commands/unlock-team.command';
import { TransferCaptaincyCommand } from './commands/transfer-captaincy.command';
import { CancelInvitationCommand } from './commands/cancel-invitation.command';
import { JoinCodeCommand } from './commands/join-code.command';
import { JoinByCodeCommand } from './commands/join-by-code.command';
import { CreateJoinRequestCommand } from './commands/create-join-request.command';
import { AcceptJoinRequestCommand } from './commands/accept-join-request.command';
import { DeclineJoinRequestCommand } from './commands/decline-join-request.command';
import { LookingForTeamCommand } from './commands/looking-for-team.command';
import { GetJoinRequestsQuery } from './queries/get-join-requests.query';
import { GetLookingForTeamQuery } from './queries/get-looking-for-team.query';
import { GetTournamentAvailabilityQuery } from './queries/get-tournament-availability.query';
import { GetTeamProfileQuery } from './queries/get-team-profile.query';

@Injectable()
export class TeamsService {
    constructor(
        private readonly createCmd: CreateTeamCommand,
        private readonly setAdminCmd: SetAdminCommand,
        private readonly inviteCmd: InvitePlayerCommand,
        private readonly kickCmd: KickPlayerCommand,
        private readonly lockCmd: LockTeamCommand,
        private readonly acceptCmd: AcceptInvitationCommand,
        private readonly declineCmd: DeclineInvitationCommand,
        private readonly deleteCmd: DeleteTeamCommand,
        private readonly leaveCmd: LeaveTeamCommand,
        private readonly getInvitesQuery: GetMyInvitationsQuery,
        private readonly getMyTeamQuery: GetMyTeamForTournamentQuery,
        private readonly renameCmd: RenameTeamCommand,
        private readonly unlockCmd: UnlockTeamCommand,
        private readonly transferCmd: TransferCaptaincyCommand,
        private readonly cancelInviteCmd: CancelInvitationCommand,
        private readonly joinCodeCmd: JoinCodeCommand,
        private readonly joinByCodeCmd: JoinByCodeCommand,
        private readonly createRequestCmd: CreateJoinRequestCommand,
        private readonly acceptRequestCmd: AcceptJoinRequestCommand,
        private readonly declineRequestCmd: DeclineJoinRequestCommand,
        private readonly lftCmd: LookingForTeamCommand,
        private readonly joinRequestsQuery: GetJoinRequestsQuery,
        private readonly lftQuery: GetLookingForTeamQuery,
        private readonly availabilityQuery: GetTournamentAvailabilityQuery,
        private readonly profileQuery: GetTeamProfileQuery,
    ) {}

    async getProfile(teamId: number) {
        return await this.profileQuery.execute(teamId);
    }

    async create(dto: CreateTeamDto, user: User) {
        return await this.createCmd.execute(dto, user);
    }

    async invite(teamId: number, targetId: number, actorId: number) {
        return await this.inviteCmd.execute(teamId, targetId, actorId);
    }

    async kick(teamId: number, targetId: number, actorId: number) {
        return await this.kickCmd.execute(teamId, targetId, actorId);
    }

    async lock(teamId: number, actorId: number) {
        return await this.lockCmd.execute(teamId, actorId);
    }

    async promote(teamId: number, targetId: number, actorId: number) {
        return await this.setAdminCmd.promote(teamId, targetId, actorId);
    }

    async demote(teamId: number, targetId: number, actorId: number) {
        return await this.setAdminCmd.demote(teamId, targetId, actorId);
    }

    async getMyInvitations(userId: number) {
        return await this.getInvitesQuery.execute(userId);
    }

    async acceptInvitation(inviteId: number, userId: number) {
        return await this.acceptCmd.execute(inviteId, userId);
    }

    async declineInvitation(inviteId: number, userId: number) {
        return await this.declineCmd.execute(inviteId, userId);
    }

    async deleteTeam(teamId: number, userId: number) {
        return await this.deleteCmd.execute(teamId, userId);
    }

    async leaveTeam(teamId: number, userId: number) {
        return await this.leaveCmd.execute(teamId, userId);
    }

    async getMyTeamForTournament(tournamentId: number, userId: number) {
        return await this.getMyTeamQuery.execute(tournamentId, userId);
    }

    async getTeamPendingInvitations(teamId: number, requesterId: number) {
        return await this.getMyTeamQuery.getPendingInvitations(teamId, requesterId);
    }

    async rename(teamId: number, name: string, actorId: number) {
        return await this.renameCmd.execute(teamId, name, actorId);
    }

    async unlock(teamId: number, actorId: number) {
        return await this.unlockCmd.execute(teamId, actorId);
    }

    async transferCaptaincy(teamId: number, targetId: number, actorId: number) {
        return await this.transferCmd.execute(teamId, targetId, actorId);
    }

    async cancelInvitation(invitationId: number, actorId: number) {
        return await this.cancelInviteCmd.execute(invitationId, actorId);
    }

    async getJoinCode(teamId: number, requesterId: number) {
        return await this.joinCodeCmd.get(teamId, requesterId);
    }

    async regenerateJoinCode(teamId: number, actorId: number) {
        return await this.joinCodeCmd.regenerate(teamId, actorId);
    }

    async joinByCode(code: string, userId: number) {
        return await this.joinByCodeCmd.execute(code, userId);
    }

    async requestToJoin(teamId: number, userId: number, note?: string) {
        return await this.createRequestCmd.execute(teamId, userId, note);
    }

    async getJoinRequests(teamId: number, requesterId: number) {
        return await this.joinRequestsQuery.execute(teamId, requesterId);
    }

    async acceptJoinRequest(requestId: number, actorId: number) {
        return await this.acceptRequestCmd.execute(requestId, actorId);
    }

    async declineJoinRequest(requestId: number, actorId: number) {
        return await this.declineRequestCmd.execute(requestId, actorId);
    }

    async flagLookingForTeam(tournamentId: number, userId: number, note?: string) {
        return await this.lftCmd.flag(tournamentId, userId, note);
    }

    async unflagLookingForTeam(tournamentId: number, userId: number) {
        return await this.lftCmd.unflag(tournamentId, userId);
    }

    async listLookingForTeam(tournamentId: number) {
        return await this.lftQuery.execute(tournamentId);
    }

    async getTournamentAvailability(tournamentId: number) {
        return await this.availabilityQuery.execute(tournamentId);
    }
}
