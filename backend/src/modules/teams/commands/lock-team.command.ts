import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Team, TeamStatus } from '../entities/team.entity';
import { assertRegistrationOpen } from '../../tournaments/services/registration-window';
import { TeamPermissionsService } from '../services/team-permissions.service';
import { RealtimeService } from '../../realtime/realtime.service';
import { RealtimeEvents } from '../../realtime/realtime.events';
import { maxRosterSize } from '../utils/roster';

@Injectable()
export class LockTeamCommand {
  constructor(
    @InjectRepository(Team) private teamRepo: Repository<Team>,
    private readonly permissions: TeamPermissionsService,
    private readonly realtime: RealtimeService,
  ) {}

  async execute(teamId: number, actorId: number) {
    const team = await this.teamRepo.findOne({
      where: { id: teamId },
      relations: ['members', 'tournament', 'tournament.phases', 'tournament.phases.game']
    });

    if (!team) throw new NotFoundException('Team not found');
    await this.permissions.assertAdmin(teamId, team.captain_id, actorId);

    if (team.status === TeamStatus.LOCKED) {
      throw new BadRequestException('Team is already locked');
    }

    assertRegistrationOpen(team.tournament);

    // Look at Phase 1's game to see required team size
    const phase1 = team.tournament?.phases?.find(p => p.order === 1);
    if (!phase1) {
      throw new BadRequestException('Tournament has no phase 1, so the required size is unknown');
    }
    const requiredSize = phase1.game?.teamSize ?? 1;

    // The starters are required; up to two substitutes may ride along (see utils/roster.ts).
    if (team.members.length < requiredSize) {
      throw new BadRequestException(`Team must have at least ${requiredSize} players to lock.`);
    }
    if (team.members.length > maxRosterSize(requiredSize)) {
      throw new BadRequestException(`Team can have at most ${maxRosterSize(requiredSize)} players (${requiredSize} plus substitutes).`);
    }

    if (team.tournament.max_participants != null) {
      const lockedCount = await this.teamRepo.count({
        where: { tournament: { id: team.tournament.id }, status: TeamStatus.LOCKED },
      });
      if (lockedCount >= team.tournament.max_participants) {
        throw new ConflictException('This tournament is full');
      }
    }

    team.status = TeamStatus.LOCKED;
    const saved = await this.teamRepo.save(team);

    this.realtime.toTeam(teamId, RealtimeEvents.TEAM_UPDATED, { id: teamId, reason: 'team_locked' });
    this.realtime.toTournament(team.tournament.id, RealtimeEvents.TOURNAMENT_UPDATED, { id: team.tournament.id, reason: 'team_locked' });
    return saved;
  }
}
