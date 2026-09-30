import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Team } from '../entities/team.entity';
import { TeamAdmin } from '../entities/team-admin.entity';
import { NotificationsService } from '../../notifications/notifications.service';
import { NotificationDestination } from '../../notifications/entities/notification.entity';
import { RealtimeService } from '../../realtime/realtime.service';
import { RealtimeEvents } from '../../realtime/realtime.events';

@Injectable()
export class TransferCaptaincyCommand {
    constructor(
        @InjectRepository(Team) private teamRepo: Repository<Team>,
        @InjectRepository(TeamAdmin) private adminRepo: Repository<TeamAdmin>,
        private readonly notificationsService: NotificationsService,
        private readonly realtime: RealtimeService,
    ) {}

    /** Captain only. The old captain becomes a team admin so they keep management rights. */
    async execute(teamId: number, targetUserId: number, actorId: number): Promise<Team> {
        const team = await this.teamRepo.findOne({
            where: { id: teamId },
            relations: ['members'],
        });
        if (!team) throw new NotFoundException('Team not found');
        if (team.captain_id !== actorId) {
            throw new ForbiddenException('Only the captain can transfer captaincy');
        }
        if (targetUserId === actorId) {
            throw new BadRequestException('You are already the captain');
        }
        if (!team.members.some((m) => m.id === targetUserId)) {
            throw new NotFoundException('User is not a member of this team');
        }

        const oldCaptainId = team.captain_id;
        team.captain_id = targetUserId;

        // The new captain doesn't need an explicit admin row (captaincy implies it); the old
        // captain does, so their rights survive the handover.
        await this.adminRepo.delete({ teamId, userId: targetUserId });
        const alreadyAdmin = await this.adminRepo.existsBy({ teamId, userId: oldCaptainId });
        if (!alreadyAdmin) {
            await this.adminRepo.save(this.adminRepo.create({ teamId, userId: oldCaptainId, grantedBy: oldCaptainId }));
        }

        const saved = await this.teamRepo.save(team);

        this.realtime.toTeam(teamId, RealtimeEvents.TEAM_UPDATED, { id: teamId, reason: 'captain_transferred' });

        try {
            await this.notificationsService.sendNotification(
                targetUserId,
                'team_captain_transferred',
                `You are now the captain of team "${team.name}"`,
                undefined,
                { teamId, teamName: team.name, actorId },
                NotificationDestination.BELL,
            );
        } catch (e) {
            console.error('Failed to send captaincy-transferred notification:', e);
        }

        return saved;
    }
}
