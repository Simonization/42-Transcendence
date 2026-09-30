import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Team, TeamStatus } from '../entities/team.entity';
import { InvitationDirection, InvitationStatus, TeamInvitation } from '../entities/team-invitation.entity';
import { TournamentStatus } from '../../tournaments/entities/tournament.entity';
import { NotificationsService } from '../../notifications/notifications.service';
import { NotificationDestination } from '../../notifications/entities/notification.entity';
import { TeamPermissionsService } from '../services/team-permissions.service';
import { RealtimeService } from '../../realtime/realtime.service';
import { RealtimeEvents } from '../../realtime/realtime.events';
import { maxRosterSize, teamSizeOf } from '../utils/roster';

@Injectable()
export class CreateJoinRequestCommand {
    constructor(
        @InjectRepository(Team) private teamRepo: Repository<Team>,
        @InjectRepository(TeamInvitation) private inviteRepo: Repository<TeamInvitation>,
        private readonly notificationsService: NotificationsService,
        private readonly permissions: TeamPermissionsService,
        private readonly realtime: RealtimeService,
    ) {}

    async execute(teamId: number, userId: number, note?: string): Promise<TeamInvitation> {
        const team = await this.teamRepo.findOne({
            where: { id: teamId },
            relations: ['members', 'tournament', 'tournament.phases', 'tournament.phases.game'],
        });
        if (!team) throw new NotFoundException('Team not found');

        if (team.status !== TeamStatus.DRAFT) {
            throw new BadRequestException('This team is not open to new members');
        }
        if (team.tournament?.status !== TournamentStatus.REGISTRATION_OPEN) {
            throw new BadRequestException('Tournament is not open for registration');
        }
        if (team.members.some((m) => m.id === userId)) {
            throw new BadRequestException('You are already a member of this team');
        }

        const maxSize = maxRosterSize(teamSizeOf(team.tournament));
        if (team.members.length >= maxSize) {
            throw new BadRequestException(`That team is already full (${maxSize} players including substitutes)`);
        }

        const existing = await this.inviteRepo.findOne({
            where: {
                team_id: teamId,
                sender_id: userId,
                status: InvitationStatus.PENDING,
                direction: InvitationDirection.REQUEST,
            },
        });
        if (existing) {
            throw new BadRequestException('You already have a pending request for this team');
        }

        const request = this.inviteRepo.create({
            team_id: teamId,
            sender_id: userId,
            receiver_id: team.captain_id,
            status: InvitationStatus.PENDING,
            direction: InvitationDirection.REQUEST,
            note: note ?? null,
        });
        const saved = await this.inviteRepo.save(request);

        const admins = await this.permissions.listAdminIds(teamId);
        const notifyIds = [team.captain_id, ...admins];
        for (const adminId of notifyIds) {
            this.realtime.toUser(adminId, RealtimeEvents.INVITATION_RECEIVED, { id: saved.id, reason: 'join_request' });
            try {
                await this.notificationsService.sendNotification(
                    adminId,
                    'team_join_request',
                    `Someone wants to join team "${team.name}"`,
                    undefined,
                    { teamId, teamName: team.name, requestId: saved.id, note },
                    NotificationDestination.BELL,
                );
            } catch (e) {
                console.error('Failed to send join-request notification:', e);
            }
        }

        return saved;
    }
}
