import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Team } from '../entities/team.entity';
import { TournamentStatus } from '../../tournaments/entities/tournament.entity';
import { TeamPermissionsService } from '../services/team-permissions.service';

@Injectable()
export class RenameTeamCommand {
    constructor(
        @InjectRepository(Team) private teamRepo: Repository<Team>,
        private readonly permissions: TeamPermissionsService,
    ) {}

    async execute(teamId: number, name: string, actorId: number): Promise<Team> {
        const team = await this.teamRepo.findOne({
            where: { id: teamId },
            relations: ['tournament'],
        });
        if (!team) throw new NotFoundException('Team not found');
        await this.permissions.assertAdmin(teamId, team.captain_id, actorId);

        const tournamentStatus = team.tournament?.status;
        if (tournamentStatus === TournamentStatus.ONGOING || tournamentStatus === TournamentStatus.COMPLETED) {
            throw new BadRequestException('Cannot rename a team once the tournament has started');
        }

        team.name = name;
        return await this.teamRepo.save(team);
    }
}
