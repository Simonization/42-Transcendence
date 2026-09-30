import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Team, TeamStatus } from '../entities/team.entity';
import { CreateTeamDto } from '../dto/create-team.dto';
import { User } from '../../users/entities/user.entity';
import { Tournament } from '../../tournaments/entities/tournament.entity';
import { assertRegistrationOpen } from '../../tournaments/services/registration-window';
import { LookingForTeam } from '../entities/looking-for-team.entity';
import { generateJoinCode } from '../utils/join-code';
import { RealtimeService } from '../../realtime/realtime.service';
import { RealtimeEvents } from '../../realtime/realtime.events';

@Injectable()
export class CreateTeamCommand {
    constructor(
        @InjectRepository(Team) private teamRepo: Repository<Team>,
        @InjectRepository(Tournament) private tournamentRepo: Repository<Tournament>,
        private dataSource: DataSource,
        private readonly realtime: RealtimeService,
    ) {}

    async execute(dto: CreateTeamDto, user: User): Promise<Team> {
        // 1. Check if tournament exists
        const tournament = await this.tournamentRepo.findOneBy({ id: dto.tournament_id });
        if (!tournament) throw new NotFoundException('Tournament not found');

        assertRegistrationOpen(tournament);

        // 2. One team per user per tournament
        const existing = await this.teamRepo
            .createQueryBuilder('team')
            .innerJoin('team.members', 'member', 'member.id = :userId', { userId: user.id })
            .where('team.tournament = :tournamentId', { tournamentId: tournament.id })
            .getOne();
        if (existing) {
            throw new ConflictException('You already have a team in this tournament');
        }

        // 3. Create the team in DRAFT status, with a unique join code
        const team = this.teamRepo.create({
            name: dto.name,
            status: TeamStatus.DRAFT,
            captain_id: user.id,
            tournament: tournament,
            members: [user],
            join_code: await this.uniqueJoinCode(),
        });

        const saved = await this.teamRepo.save(team);

        // Creating a team means the user is no longer "looking for one" in this tournament.
        await this.dataSource.manager.delete(LookingForTeam, { userId: user.id, tournamentId: tournament.id });

        // The tournament's team list changed, and the creator left the LFT board.
        this.realtime.toTournament(tournament.id, RealtimeEvents.TOURNAMENT_UPDATED, { id: tournament.id, reason: 'team_created' });

        return saved;
    }

    private async uniqueJoinCode(): Promise<string> {
        for (let attempt = 0; attempt < 5; attempt++) {
            const code = generateJoinCode();
            const exists = await this.teamRepo
                .createQueryBuilder('team')
                .addSelect('team.join_code')
                .where('team.join_code = :code', { code })
                .getExists();
            if (!exists) return code;
        }
        throw new Error('Could not generate a unique join code');
    }
}
