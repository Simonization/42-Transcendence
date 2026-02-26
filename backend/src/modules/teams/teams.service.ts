import { Injectable } from '@nestjs/common';
import { CreateTeamCommand } from './commands/create-team.command';
import { CreateTeamDto } from './dto/create-team.dto';
import { User } from '../users/entities/user.entity';
import { KickPlayerCommand } from './commands/kick-player.command';
import { InvitePlayerCommand } from './commands/invite-player.command';
import { LockTeamCommand } from './commands/lock-team.command';
import { GetMyInvitationsQuery } from './queries/get-my-invitations.query';
import { DeclineInvitationCommand } from './commands/decline-invitation.command';
import { AcceptInvitationCommand } from './commands/accept-invitation.command';

@Injectable()
export class TeamsService {
    constructor(
        private readonly createCmd: CreateTeamCommand,
        private readonly inviteCmd: InvitePlayerCommand,
        private readonly kickCmd: KickPlayerCommand,
        private readonly lockCmd: LockTeamCommand,
        private readonly acceptCmd: AcceptInvitationCommand,
        private readonly declineCmd: DeclineInvitationCommand,
        private readonly getInvitesQuery: GetMyInvitationsQuery,
    ) {}

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

    async getMyInvitations(userId: number) {
        return await this.getInvitesQuery.execute(userId);
    }

    async acceptInvitation(inviteId: number, userId: number) {
        return await this.acceptCmd.execute(inviteId, userId);
    }

    async declineInvitation(inviteId: number, userId: number) {
        return await this.declineCmd.execute(inviteId, userId);
    }
}