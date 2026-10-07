import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Team, TeamStatus } from '../entities/team.entity';
import { InvitationDirection, InvitationStatus, TeamInvitation } from '../entities/team-invitation.entity';
import { User } from '../../users/entities/user.entity';
import { NotificationsService } from '../../notifications/notifications.service';
import { NotificationDestination } from '../../notifications/entities/notification.entity';
import { TeamPermissionsService } from '../services/team-permissions.service';
import { RealtimeService } from '../../realtime/realtime.service';
import { RealtimeEvents } from '../../realtime/realtime.events';
import { maxRosterSize, teamSizeOf } from '../utils/roster';
import { assertRegistrationOpen } from '../../tournaments/services/registration-window';

@Injectable()
export class InvitePlayerCommand {
    constructor(
        @InjectRepository(Team) private teamRepo: Repository<Team>,
        @InjectRepository(TeamInvitation) private inviteRepo: Repository<TeamInvitation>,
        @InjectRepository(User) private userRepo: Repository<User>,
        private readonly notificationsService: NotificationsService,
        private readonly permissions: TeamPermissionsService,
        private readonly realtime: RealtimeService,
    ) {}

    async execute(teamId: number, targetUserId: number, actorId: number) {
        // 1. Fetch team and validate existence
        const team = await this.teamRepo.findOne({
            where: { id: teamId },
            relations: ['members', 'tournament', 'tournament.phases', 'tournament.phases.game']
        });

        if (!team) throw new NotFoundException('Team not found');

        // 2. Security: the captain or any team admin can invite
        await this.permissions.assertAdmin(teamId, team.captain_id, actorId);

        // 3. Validation: Can't invite if team is locked
        if (team.status === TeamStatus.LOCKED) {
            throw new BadRequestException('Cannot invite players to a locked team');
        }

        // 3a. Not after the deadline or the start: the invitation could never be accepted
        //     (accept-invitation refuses the same way), so it is not sent at all.
        assertRegistrationOpen(team.tournament);

        // 3b. Validation: the bench is capped (teamSize starters + a few substitutes)
        const maxSize = maxRosterSize(teamSizeOf(team.tournament));
        if (team.members.length >= maxSize) {
            throw new BadRequestException(`That team is already full (${maxSize} players including substitutes)`);
        }

        // 3c. The target must be a live account (deleted ones are tombstones).
        const target = await this.userRepo.findOne({ where: { id: targetUserId } });
        if (!target || target.deletedAt) throw new NotFoundException('User not found');

        // 4. Validation: Check if user is already a member
        if (team.members.some(m => m.id === targetUserId)) {
            throw new BadRequestException('User is already in this team');
        }

        // 5. Validation: Check for existing pending invitation
        const existingInvite = await this.inviteRepo.findOne({
            where: {
                team_id: teamId,
                receiver_id: targetUserId,
                status: InvitationStatus.PENDING,
                direction: InvitationDirection.INVITE,
            }
        });

        if (existingInvite) {
            throw new BadRequestException('An invitation is already pending for this user');
        }

        // 6. Create the invitation record
        const invitation = this.inviteRepo.create({
            team_id: teamId,
            receiver_id: targetUserId,
            sender_id: actorId,
            status: InvitationStatus.PENDING,
            direction: InvitationDirection.INVITE,
        });

        const savedInvitation = await this.inviteRepo.save(invitation);

        this.realtime.toUser(targetUserId, RealtimeEvents.INVITATION_RECEIVED, { id: savedInvitation.id, reason: 'invited' });
        this.realtime.toTeam(teamId, RealtimeEvents.TEAM_UPDATED, { id: teamId, reason: 'invitation_sent' });

        // 7. Send notification to the invited player (BELL only)
        try {
            const actor = await this.userRepo.findOne({ where: { id: actorId } });
            const actorName = actor?.username || 'Unknown';

            await this.notificationsService.sendNotification(
                targetUserId,
                'team_invite',
                `${actorName} invited you to join team "${team.name}"`,
                undefined,
                {
                    teamId: team.id,
                    teamName: team.name,
                    inviterId: actorId,
                    inviterName: actorName,
                    invitationId: savedInvitation.id,
                },
                NotificationDestination.BELL,
            );
        } catch (notifError) {
            console.error('Failed to send team invitation notification:', notifError);
        }

        return savedInvitation;
    }
}
