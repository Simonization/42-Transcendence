import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Team, TeamStatus } from '../entities/team.entity';

@Injectable()
export class LockTeamCommand {
  constructor(@InjectRepository(Team) private teamRepo: Repository<Team>) {}

  async execute(teamId: number, actorId: number) {
    const team = await this.teamRepo.findOne({
      where: { id: teamId },
      relations: ['members', 'tournament', 'tournament.phases', 'tournament.phases.game']
    });

    if (!team) throw new NotFoundException();
    if (team.captain_id !== actorId) throw new ForbiddenException();

    // Look at Phase 1's game to see required team size
    const phase1 = team.tournament.phases.find(p => p.order === 1);
    const requiredSize = phase1?.game.teamSize ?? 1;

    if (team.members.length !== requiredSize) {
      throw new BadRequestException(`Team must have exactly ${requiredSize} players to lock.`);
    }

    team.status = TeamStatus.LOCKED;
    return await this.teamRepo.save(team);
  }
}