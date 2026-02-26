import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Team, TeamStatus } from '../entities/team.entity';

@Injectable()
export class KickPlayerCommand {
  constructor(@InjectRepository(Team) private teamRepo: Repository<Team>) {}

  async execute(teamId: number, targetUserId: number, actorId: number) {
    const team = await this.teamRepo.findOne({
      where: { id: teamId },
      relations: ['members']
    });

    if (!team) throw new NotFoundException('Team not found');
    if (team.captain_id !== actorId) throw new ForbiddenException('Only the captain can kick players');
    if (targetUserId === actorId) throw new BadRequestException('You cannot kick yourself');

    team.members = team.members.filter(m => m.id !== targetUserId);
    return await this.teamRepo.save(team);
  }
}