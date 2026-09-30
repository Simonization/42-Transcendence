import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Team } from '../entities/team.entity';
import { InvitationDirection, InvitationStatus, TeamInvitation } from '../entities/team-invitation.entity';
import { TeamPermissionsService } from '../services/team-permissions.service';

@Injectable()
export class GetJoinRequestsQuery {
    constructor(
        @InjectRepository(Team) private teamRepo: Repository<Team>,
        @InjectRepository(TeamInvitation) private inviteRepo: Repository<TeamInvitation>,
        private readonly permissions: TeamPermissionsService,
    ) {}

    /** Captain/admins only: pending join requests for a team. */
    async execute(teamId: number, requesterId: number): Promise<TeamInvitation[]> {
        const team = await this.teamRepo.findOneBy({ id: teamId });
        if (!team) return [];
        await this.permissions.assertAdmin(teamId, team.captain_id, requesterId);

        return this.inviteRepo.find({
            where: { team_id: teamId, status: InvitationStatus.PENDING, direction: InvitationDirection.REQUEST },
            relations: ['sender'],
        });
    }
}
