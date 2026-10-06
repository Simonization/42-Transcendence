import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Team, TeamStatus } from '../entities/team.entity';
import { Tournament } from '../../tournaments/entities/tournament.entity';
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
    const saved = await this.teamRepo.manager.transaction(async (manager) => {
      // Lock the tournament, then the team (the bracket engine's order: tournament first), so
      // two teams locking at once cannot both take the last spot under max_participants, and
      // the roster cannot change between the size check and the lock.
      const peek = await manager.findOne(Team, { where: { id: teamId }, relations: ['tournament'] });
      if (!peek) throw new NotFoundException('Team not found');
      if (peek.tournament?.id != null) {
        await manager.findOne(Tournament, { where: { id: peek.tournament.id }, lock: { mode: 'pessimistic_write' } });
      }
      await manager.findOne(Team, { where: { id: teamId }, lock: { mode: 'pessimistic_write' } });
      return this.lockLocked(manager, teamId, actorId);
    });

    this.realtime.toTeam(teamId, RealtimeEvents.TEAM_UPDATED, { id: teamId, reason: 'team_locked' });
    this.realtime.toTournament(saved.tournament.id, RealtimeEvents.TOURNAMENT_UPDATED, { id: saved.tournament.id, reason: 'team_locked' });
    return saved;
  }

  /** The checks and the write, on rows this transaction holds locked. */
  private async lockLocked(manager: EntityManager, teamId: number, actorId: number): Promise<Team> {
    const team = await manager.findOne(Team, {
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
      const lockedCount = await manager.count(Team, {
        where: { tournament: { id: team.tournament.id }, status: TeamStatus.LOCKED },
      });
      if (lockedCount >= team.tournament.max_participants) {
        throw new ConflictException('This tournament is full');
      }
    }

    team.status = TeamStatus.LOCKED;
    return manager.save(team);
  }
}
