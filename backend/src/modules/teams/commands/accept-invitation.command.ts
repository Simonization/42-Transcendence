import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Team, TeamStatus } from '../entities/team.entity';
import { User } from '../../users/entities/user.entity';
import { InvitationDirection, InvitationStatus, TeamInvitation } from '../entities/team-invitation.entity';
import { NotificationsService } from '../../notifications/notifications.service';
import { NotificationDestination } from '../../notifications/entities/notification.entity';
import { TeamMembershipService, DepartedTeam } from '../services/team-membership.service';
import { publishDepartures } from '../utils/publish-departures';
import { RealtimeService } from '../../realtime/realtime.service';
import { RealtimeEvents } from '../../realtime/realtime.events';

@Injectable()
export class AcceptInvitationCommand {
    constructor(
        private dataSource: DataSource,
        @InjectRepository(TeamInvitation) private inviteRepo: Repository<TeamInvitation>,
        private readonly notificationsService: NotificationsService,
        private readonly membership: TeamMembershipService,
        private readonly realtime: RealtimeService,
    ) {}

    async execute(invitationId: number, userId: number) {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        let departed: DepartedTeam[] = [];

        try {
            const invite = await queryRunner.manager.findOne(TeamInvitation, {
                where: {
                    id: invitationId,
                    receiver_id: userId,
                    status: InvitationStatus.PENDING,
                    direction: InvitationDirection.INVITE,
                },
                relations: [
                    'team',
                    'team.members',
                    'team.tournament',
                    'team.tournament.phases',
                    'team.tournament.phases.game',
                ]
            });

            if (!invite) throw new NotFoundException('Invitation not found or already processed');

            const team = invite.team;

            // Without these two guards a stale invitation can inflate a roster past the size the
            // game requires, and `lock` compares for equality — leaving the team unlockable.
            if (team.status === TeamStatus.LOCKED) {
                throw new BadRequestException('That team is locked and cannot take new members');
            }

            const phase1 = team.tournament?.phases?.find(p => p.order === 1);
            const maxSize = phase1?.game?.teamSize ?? 1;
            if (team.members.length >= maxSize) {
                throw new BadRequestException(`That team is already full (${maxSize} players)`);
            }

            // One team per tournament: block if the user is locked into another team here,
            // otherwise quietly pull them out of any other DRAFT team in this tournament.
            if (team.tournament?.id) {
                departed = await this.membership.assertCanJoin(queryRunner.manager, userId, team.tournament.id, team.id);
            }

            invite.status = InvitationStatus.ACCEPTED;
            await queryRunner.manager.save(invite);

            const user = await queryRunner.manager.findOneBy(User, { id: userId });
            if (!user) throw new NotFoundException('User not found');

            team.members.push(user);
            await queryRunner.manager.save(team);

            if (team.tournament?.id) {
                await this.membership.clearLookingForTeam(queryRunner.manager, userId, team.tournament.id);
            }

            await queryRunner.commitTransaction();

            publishDepartures(this.realtime, team.tournament?.id, userId, departed);
            this.realtime.toTeam(team.id, RealtimeEvents.TEAM_UPDATED, { id: team.id, reason: 'member_joined' });
            this.realtime.toUser(invite.sender_id, RealtimeEvents.INVITATION_RECEIVED, { id: invite.id, reason: 'invitation_accepted' });
            if (team.tournament?.id) {
                this.realtime.toTournament(team.tournament.id, RealtimeEvents.TOURNAMENT_UPDATED, { id: team.tournament.id, reason: 'looking_for_team_changed' });
            }

            // After commit and outside the transaction: a failed notification must not
            // roll back a roster change the user already sees as done.
            try {
                await this.notificationsService.sendNotification(
                    invite.sender_id,
                    'team_invite_accepted',
                    `${user.username} joined your team "${team.name}"`,
                    undefined,
                    { teamId: team.id, teamName: team.name, userId },
                    NotificationDestination.BELL,
                );
            } catch (e) {
                console.error('Failed to send invite-accepted notification:', e);
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
