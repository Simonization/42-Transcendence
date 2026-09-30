import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Team, TeamStatus } from '../entities/team.entity';
import { TournamentStatus } from '../../tournaments/entities/tournament.entity';
import { TeamPermissionsService } from '../services/team-permissions.service';

@Injectable()
export class UnlockTeamCommand {
    constructor(
        @InjectRepository(Team) private teamRepo: Repository<Team>,
        private readonly permissions: TeamPermissionsService,
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
        if (team.tournament?.status !== TournamentStatus.REGISTRATION_OPEN) {
            throw new BadRequestException('Cannot unlock once registration has closed');
        }

        team.status = TeamStatus.DRAFT;
        return await this.teamRepo.save(team);
    }
}
