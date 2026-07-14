import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Team, TeamStatus } from '../entities/team.entity';
import { InvitationStatus, TeamInvitation } from '../entities/team-invitation.entity';
import { User } from '../../users/entities/user.entity';
import { NotificationsService } from '../../notifications/notifications.service';
import { NotificationDestination } from '../../notifications/entities/notification.entity';

@Injectable()
export class InvitePlayerCommand {
    constructor(
        @InjectRepository(Team) private teamRepo: Repository<Team>,
        @InjectRepository(TeamInvitation) private inviteRepo: Repository<TeamInvitation>,
        @InjectRepository(User) private userRepo: Repository<User>,
        private readonly notificationsService: NotificationsService,
    ) {}

    async execute(teamId: number, targetUserId: number, actorId: number) {
        // 1. Fetch team and validate existence
        const team = await this.teamRepo.findOne({
            where: { id: teamId },
            relations: ['members', 'tournament']
        });

        if (!team) throw new NotFoundException('Team not found');

        // 2. Security: Only the captain can invite
        if (team.captain_id !== actorId) {
            throw new ForbiddenException('Only the captain can invite players');
        }

        // 3. Validation: Can't invite if team is locked
        if (team.status === TeamStatus.LOCKED) {
            throw new BadRequestException('Cannot invite players to a locked team');
        }

        // 4. Validation: Check if user is already a member
        if (team.members.some(m => m.id === targetUserId)) {
            throw new BadRequestException('User is already in this team');
        }

        // 5. Validation: Check for existing pending invitation
        const existingInvite = await this.inviteRepo.findOne({
            where: {
                team_id: teamId,
                receiver_id: targetUserId,
                status: InvitationStatus.PENDING
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
            status: InvitationStatus.PENDING
        });

        const savedInvitation = await this.inviteRepo.save(invitation);

        // 7. Send notification to the invited player (BELL only)
        try {
            const captain = await this.userRepo.findOne({ where: { id: actorId } });
            const captainName = captain?.username || 'Unknown';

            await this.notificationsService.sendNotification(
                targetUserId,
                'team_invite',
                `${captainName} invited you to join team "${team.name}"`,
                undefined,
                {
                    teamId: team.id,
                    teamName: team.name,
                    captainId: actorId,
                    captainName: captainName,
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
