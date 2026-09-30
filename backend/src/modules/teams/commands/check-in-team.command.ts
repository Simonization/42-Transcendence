import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Team, TeamStatus } from '../entities/team.entity';
import { TeamPermissionsService } from '../services/team-permissions.service';
import { checkinState } from '../../tournaments/services/registration-window';
import { RealtimeService } from '../../realtime/realtime.service';
import { RealtimeEvents } from '../../realtime/realtime.events';

@Injectable()
export class CheckInTeamCommand {
    constructor(
        @InjectRepository(Team) private teamRepo: Repository<Team>,
        private readonly permissions: TeamPermissionsService,
        private readonly realtime: RealtimeService,
    ) {}

    /**
     * Marks a LOCKED team as present. Allowed for the captain or a team admin, or for a global
     * admin (`asAdmin`, decided by the controller from the JWT role). Only while the check-in
     * window is open. Checking in twice is a no-op.
     */
    async execute(teamId: number, actorId: number, asAdmin = false): Promise<Team> {
        const team = await this.teamRepo.findOne({ where: { id: teamId }, relations: ['tournament'] });
        if (!team) throw new NotFoundException('Team not found');
        if (!asAdmin) await this.permissions.assertAdmin(teamId, team.captain_id, actorId);

        if (!team.tournament) throw new BadRequestException('This team is not in a tournament');
        const state = checkinState(team.tournament);
        if (state === 'off') throw new BadRequestException('This tournament has no check-in');
        if (state === 'upcoming') throw new BadRequestException('Check-in has not opened yet');
        if (state === 'closed') throw new BadRequestException('Check-in is closed');
        if (team.status !== TeamStatus.LOCKED) {
            throw new BadRequestException('Only a locked team can check in');
        }
        if (team.checked_in_at) return team;

        team.checked_in_at = new Date();
        const saved = await this.teamRepo.save(team);

        this.realtime.toTeam(teamId, RealtimeEvents.TEAM_UPDATED, { id: teamId, reason: 'team_checked_in' });
        this.realtime.toTournament(team.tournament.id, RealtimeEvents.TOURNAMENT_UPDATED, {
            id: team.tournament.id,
            reason: 'team_checked_in',
        });
        return saved;
    }
}
