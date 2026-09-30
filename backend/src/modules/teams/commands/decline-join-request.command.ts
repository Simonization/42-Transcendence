import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Team } from '../entities/team.entity';
import { InvitationDirection, InvitationStatus, TeamInvitation } from '../entities/team-invitation.entity';
import { NotificationsService } from '../../notifications/notifications.service';
import { NotificationDestination } from '../../notifications/entities/notification.entity';
import { TeamPermissionsService } from '../services/team-permissions.service';
import { RealtimeService } from '../../realtime/realtime.service';
import { RealtimeEvents } from '../../realtime/realtime.events';

@Injectable()
export class DeclineJoinRequestCommand {
    constructor(
        @InjectRepository(TeamInvitation) private inviteRepo: Repository<TeamInvitation>,
        @InjectRepository(Team) private teamRepo: Repository<Team>,
        private readonly notificationsService: NotificationsService,
        private readonly permissions: TeamPermissionsService,
        private readonly realtime: RealtimeService,
    ) {}

    async execute(requestId: number, actorId: number): Promise<TeamInvitation> {
        const request = await this.inviteRepo.findOne({
            where: { id: requestId, status: InvitationStatus.PENDING, direction: InvitationDirection.REQUEST },
        });
        if (!request) throw new NotFoundException('Join request not found or already processed');

        const team = await this.teamRepo.findOneBy({ id: request.team_id });
        if (!team) throw new NotFoundException('Team not found');
        await this.permissions.assertAdmin(team.id, team.captain_id, actorId);

        request.status = InvitationStatus.DECLINED;
        const saved = await this.inviteRepo.save(request);

        this.realtime.toUser(request.sender_id, RealtimeEvents.INVITATION_RECEIVED, { id: request.id, reason: 'request_declined' });
        this.realtime.toTeam(team.id, RealtimeEvents.TEAM_UPDATED, { id: team.id, reason: 'request_declined' });

        try {
            await this.notificationsService.sendNotification(
                request.sender_id,
                'team_join_request_declined',
                `Your request to join team "${team.name}" was declined`,
                undefined,
                { teamId: team.id, teamName: team.name },
                NotificationDestination.BELL,
            );
        } catch (e) {
            console.error('Failed to send join-request-declined notification:', e);
        }

        return saved;
    }
}
