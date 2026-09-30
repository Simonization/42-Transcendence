import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InvitationDirection, InvitationStatus, TeamInvitation } from '../entities/team-invitation.entity';
import { Team } from '../entities/team.entity';
import { TeamPermissionsService } from '../services/team-permissions.service';

/**
 * Cancels a pending invitation or join request.
 * - An INVITE (team -> user) can be cancelled by the team's captain or an admin.
 * - A REQUEST (user -> team) can be cancelled by the user who sent it.
 */
@Injectable()
export class CancelInvitationCommand {
    constructor(
        @InjectRepository(TeamInvitation) private inviteRepo: Repository<TeamInvitation>,
        @InjectRepository(Team) private teamRepo: Repository<Team>,
        private readonly permissions: TeamPermissionsService,
    ) {}

    async execute(invitationId: number, actorId: number): Promise<TeamInvitation> {
        const invite = await this.inviteRepo.findOne({
            where: { id: invitationId, status: InvitationStatus.PENDING },
        });
        if (!invite) throw new NotFoundException('Invitation not found or already processed');

        if (invite.direction === InvitationDirection.REQUEST) {
            if (invite.sender_id !== actorId) {
                throw new ForbiddenException('Only the requester can cancel a join request');
            }
        } else {
            const team = await this.teamRepo.findOneBy({ id: invite.team_id });
            if (!team) throw new NotFoundException('Team not found');
            await this.permissions.assertAdmin(team.id, team.captain_id, actorId);
        }

        invite.status = InvitationStatus.CANCELLED;
        return await this.inviteRepo.save(invite);
    }
}
