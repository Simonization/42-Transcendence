import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Team, TeamStatus } from '../entities/team.entity';
import { User } from '../../users/entities/user.entity';
import { InvitationDirection, InvitationStatus, TeamInvitation } from '../entities/team-invitation.entity';
import { NotificationsService } from '../../notifications/notifications.service';
import { NotificationDestination } from '../../notifications/entities/notification.entity';
import { TeamPermissionsService } from '../services/team-permissions.service';
import { TeamMembershipService } from '../services/team-membership.service';

@Injectable()
export class AcceptJoinRequestCommand {
    constructor(
        private dataSource: DataSource,
        private readonly notificationsService: NotificationsService,
        private readonly permissions: TeamPermissionsService,
        private readonly membership: TeamMembershipService,
    ) {}

    /** Team captain/admin accepts a pending join request. */
    async execute(requestId: number, actorId: number): Promise<{ message: string; teamId: number }> {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            const request = await queryRunner.manager.findOne(TeamInvitation, {
                where: { id: requestId, status: InvitationStatus.PENDING, direction: InvitationDirection.REQUEST },
                relations: ['team', 'team.members', 'team.tournament', 'team.tournament.phases', 'team.tournament.phases.game'],
            });
            if (!request) throw new NotFoundException('Join request not found or already processed');

            const team = request.team;
            await this.permissions.assertAdmin(team.id, team.captain_id, actorId);

            if (team.status === TeamStatus.LOCKED) {
                throw new BadRequestException('That team is locked and cannot take new members');
            }
            const phase1 = team.tournament?.phases?.find((p) => p.order === 1);
            const maxSize = phase1?.game?.teamSize ?? 1;
            if (team.members.length >= maxSize) {
                throw new BadRequestException(`That team is already full (${maxSize} players)`);
            }

            const requesterId = request.sender_id;
            if (team.tournament?.id) {
                await this.membership.assertCanJoin(queryRunner.manager, requesterId, team.tournament.id, team.id);
            }

            request.status = InvitationStatus.ACCEPTED;
            await queryRunner.manager.save(request);

            const user = await queryRunner.manager.findOneBy(User, { id: requesterId });
            if (!user) throw new NotFoundException('User not found');

            team.members.push(user);
            await queryRunner.manager.save(team);

            if (team.tournament?.id) {
                await this.membership.clearLookingForTeam(queryRunner.manager, requesterId, team.tournament.id);
            }

            await queryRunner.commitTransaction();

            try {
                await this.notificationsService.sendNotification(
                    requesterId,
                    'team_join_request_accepted',
                    `Your request to join team "${team.name}" was accepted`,
                    undefined,
                    { teamId: team.id, teamName: team.name },
                    NotificationDestination.BELL,
                );
            } catch (e) {
                console.error('Failed to send join-request-accepted notification:', e);
            }

            return { message: 'Joined team successfully', teamId: team.id };
        } catch (err) {
            await queryRunner.rollbackTransaction();
            throw err;
        } finally {
            await queryRunner.release();
        }
    }
}
