import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Team } from '../entities/team.entity';
import { TeamAdmin } from '../entities/team-admin.entity';
import { User } from '../../users/entities/user.entity';
import { NotificationsService } from '../../notifications/notifications.service';
import { NotificationDestination, NotificationType } from '../../notifications/entities/notification.entity';
import { TeamPermissionsService } from '../services/team-permissions.service';

@Injectable()
export class SetAdminCommand {
    constructor(
        @InjectRepository(Team) private teamRepo: Repository<Team>,
        @InjectRepository(TeamAdmin) private adminRepo: Repository<TeamAdmin>,
        @InjectRepository(User) private userRepo: Repository<User>,
        private readonly notificationsService: NotificationsService,
        private readonly permissions: TeamPermissionsService,
    ) {}

    async promote(teamId: number, targetUserId: number, actorId: number) {
        const team = await this.loadTeam(teamId);
        await this.permissions.assertAdmin(teamId, team.captain_id, actorId);

        if (targetUserId === team.captain_id) {
            throw new BadRequestException('The captain is always an admin');
        }
        if (!team.members.some(m => m.id === targetUserId)) {
            throw new NotFoundException('User is not a member of this team');
        }
        if (await this.adminRepo.existsBy({ teamId, userId: targetUserId })) {
            throw new BadRequestException('User is already an admin of this team');
        }

        await this.adminRepo.save(
            this.adminRepo.create({ teamId, userId: targetUserId, grantedBy: actorId }),
        );

        await this.notify(
            targetUserId,
            'team_admin_granted',
            `You are now an admin of team "${team.name}"`,
            { teamId, teamName: team.name, actorId },
        );

        return this.describe(teamId, team.captain_id);
    }

    async demote(teamId: number, targetUserId: number, actorId: number) {
        const team = await this.loadTeam(teamId);
        await this.permissions.assertAdmin(teamId, team.captain_id, actorId);

        if (targetUserId === team.captain_id) {
            throw new ForbiddenException('The captain cannot be demoted');
        }

        // Otherwise two admins could strip each other in a race; the founder arbitrates.
        if (actorId !== team.captain_id && actorId !== targetUserId) {
            throw new ForbiddenException('Only the captain can demote another admin');
        }

        const removed = await this.adminRepo.delete({ teamId, userId: targetUserId });
        if (!removed.affected) {
            throw new NotFoundException('User is not an admin of this team');
        }

        await this.notify(
            targetUserId,
            'team_admin_revoked',
            `You are no longer an admin of team "${team.name}"`,
            { teamId, teamName: team.name, actorId },
        );

        return this.describe(teamId, team.captain_id);
    }

    private async loadTeam(teamId: number): Promise<Team> {
        const team = await this.teamRepo.findOne({
            where: { id: teamId },
            relations: ['members'],
        });
        if (!team) throw new NotFoundException('Team not found');
        return team;
    }

    private async describe(teamId: number, captainId: number) {
        return {
            teamId,
            captainId,
            adminIds: await this.permissions.listAdminIds(teamId),
        };
    }

    private async notify(
        userId: number,
        type: NotificationType,
        body: string,
        data: Record<string, unknown>,
    ) {
        try {
            await this.notificationsService.sendNotification(
                userId,
                type,
                body,
                undefined,
                data,
                NotificationDestination.BELL,
            );
        } catch (e) {
            console.error(`Failed to send ${type} notification:`, e);
        }
    }
}
