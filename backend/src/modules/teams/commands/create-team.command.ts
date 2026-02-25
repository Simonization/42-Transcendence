import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Team, TeamStatus } from '../entities/team.entity';
import { CreateTeamDto } from '../dto/create-team.dto';
import { User } from '../../users/entities/user.entity';
import { Tournament } from '../../tournaments/entities/tournament.entity';

@Injectable()
export class CreateTeamCommand {
    constructor(
        @InjectRepository(Team) private teamRepo: Repository<Team>,
        @InjectRepository(Tournament) private tournamentRepo: Repository<Tournament>,
    ) {}

    async execute(dto: CreateTeamDto, user: User): Promise<Team> {
        // 1. Check if tournament exists
        const tournament = await this.tournamentRepo.findOneBy({ id: dto.tournament_id });
        if (!tournament) throw new NotFoundException('Tournament not found');

        // 2. Create the team in DRAFT status
        const team = this.teamRepo.create({
            name: dto.name,
            status: TeamStatus.DRAFT,
            captain_id: user.id,
            tournament: tournament,
            members: [user],
        });

        return await this.teamRepo.save(team);
    }
}