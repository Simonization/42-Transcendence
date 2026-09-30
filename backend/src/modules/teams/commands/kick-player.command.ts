import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Team, TeamStatus } from '../entities/team.entity';
import { TeamAdmin } from '../entities/team-admin.entity';
import { TeamPermissionsService } from '../services/team-permissions.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { NotificationDestination } from '../../notifications/entities/notification.entity';
import { RealtimeService } from '../../realtime/realtime.service';
import { RealtimeEvents } from '../../realtime/realtime.events';

@Injectable()
export class KickPlayerCommand {
  constructor(
    @InjectRepository(Team) private teamRepo: Repository<Team>,
    @InjectRepository(TeamAdmin) private adminRepo: Repository<TeamAdmin>,
    private readonly permissions: TeamPermissionsService,
    private readonly notificationsService: NotificationsService,
    private readonly realtime: RealtimeService,
  ) {}

  async execute(teamId: number, targetUserId: number, actorId: number) {
    const team = await this.teamRepo.findOne({
      where: { id: teamId },
      relations: ['members']
    });

    if (!team) throw new NotFoundException('Team not found');
    await this.permissions.assertAdmin(teamId, team.captain_id, actorId);

    if (targetUserId === actorId) throw new BadRequestException('You cannot kick yourself');
    if (targetUserId === team.captain_id) throw new ForbiddenException('The captain cannot be kicked');
    if (team.status === TeamStatus.LOCKED) {
      throw new BadRequestException('Cannot kick players from a locked team');
    }
    if (!team.members.some(m => m.id === targetUserId)) {
      throw new NotFoundException('User is not a member of this team');
    }

    // An admin may only be kicked by the captain, so admins cannot remove each other.
    const targetIsAdmin = await this.adminRepo.existsBy({ teamId, userId: targetUserId });
    if (targetIsAdmin && actorId !== team.captain_id) {
      throw new ForbiddenException('Only the captain can kick another admin');
    }

    await this.adminRepo.delete({ teamId, userId: targetUserId });
    team.members = team.members.filter(m => m.id !== targetUserId);
    const saved = await this.teamRepo.save(team);

    this.realtime.toTeam(teamId, RealtimeEvents.TEAM_UPDATED, { id: teamId, reason: 'member_kicked' });
    this.realtime.toUser(targetUserId, RealtimeEvents.INVITATION_RECEIVED, { id: teamId, reason: 'kicked' });
    this.realtime.leaveTeamRoom(targetUserId, teamId);

    try {
      await this.notificationsService.sendNotification(
        targetUserId,
        'team_member_removed',
        `You were removed from team "${team.name}"`,
        undefined,
        { teamId, teamName: team.name, actorId },
        NotificationDestination.BELL,
      );
    } catch (e) {
      console.error('Failed to send team removal notification:', e);
    }

    return saved;
  }
}
