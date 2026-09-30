import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Team, TeamStatus } from '../entities/team.entity';
import { TournamentStatus } from '../../tournaments/entities/tournament.entity';
import { TeamPermissionsService } from '../services/team-permissions.service';

@Injectable()
export class LockTeamCommand {
  constructor(
    @InjectRepository(Team) private teamRepo: Repository<Team>,
    private readonly permissions: TeamPermissionsService,
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

    if (team.tournament?.status !== TournamentStatus.REGISTRATION_OPEN) {
      throw new BadRequestException('Tournament is not open for registration');
    }

    // Look at Phase 1's game to see required team size
    const phase1 = team.tournament?.phases?.find(p => p.order === 1);
    if (!phase1) {
      throw new BadRequestException('Tournament has no phase 1, so the required size is unknown');
    }
    const requiredSize = phase1.game?.teamSize ?? 1;

    if (team.members.length !== requiredSize) {
      throw new BadRequestException(`Team must have exactly ${requiredSize} players to lock.`);
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
    return await this.teamRepo.save(team);
  }
}
