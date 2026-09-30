import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Team, TeamStatus } from '../entities/team.entity';
import { assertRegistrationOpen } from '../../tournaments/services/registration-window';
import { TeamPermissionsService } from '../services/team-permissions.service';
import { RealtimeService } from '../../realtime/realtime.service';
import { RealtimeEvents } from '../../realtime/realtime.events';

@Injectable()
export class UnlockTeamCommand {
    constructor(
        @InjectRepository(Team) private teamRepo: Repository<Team>,
        private readonly permissions: TeamPermissionsService,
        private readonly realtime: RealtimeService,
    ) {}

    async execute(teamId: number, actorId: number): Promise<Team> {
        const team = await this.teamRepo.findOne({
            where: { id: teamId },
            relations: ['tournament'],
        });
        if (!team) throw new NotFoundException('Team not found');
        await this.permissions.assertAdmin(teamId, team.captain_id, actorId);

        if (team.status !== TeamStatus.LOCKED) {
            throw new BadRequestException('Team is not locked');
        }
        assertRegistrationOpen(team.tournament, 'Cannot unlock once registration has closed');

        team.status = TeamStatus.DRAFT;
        team.checked_in_at = null;
        const saved = await this.teamRepo.save(team);

        this.realtime.toTeam(teamId, RealtimeEvents.TEAM_UPDATED, { id: teamId, reason: 'team_unlocked' });
        this.realtime.toTournament(team.tournament.id, RealtimeEvents.TOURNAMENT_UPDATED, { id: team.tournament.id, reason: 'team_unlocked' });
        return saved;
    }
}
