import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateTournamentCommand } from './commands/create-tournament.command';
import { UpdateTournamentCommand } from './commands/update-tournament.command';
import { DeleteTournamentCommand } from './commands/delete-tournament.command';
import { StartTournamentCommand } from './commands/start-tournament.command';
import { PhaseService } from './services/phase.service';
import { GetAllTournamentsQuery } from './queries/get-all-tournaments.query';
import { GetTournamentQuery } from './queries/get-tournament-details.query';
import { CreateTournamentDto } from './dto/create-tournament.dto';
import { UpdateTournamentDto } from './dto/update-tournament.dto';
import { Tournament } from './entities/tournament.entity';
import { Team, TeamStatus } from '../teams/entities/team.entity';
import { User } from '../users/entities/user.entity';

@Injectable()
export class TournamentsService {
    constructor(
        @InjectRepository(Tournament)
        private readonly tournamentRepo: Repository<Tournament>,
        @InjectRepository(Team)
        private readonly teamRepo: Repository<Team>,
        @InjectRepository(User)
        private readonly userRepo: Repository<User>,
        private readonly createCmd: CreateTournamentCommand,
        private readonly updateCmd: UpdateTournamentCommand,
        private readonly deleteCmd: DeleteTournamentCommand,
        private readonly startCmd: StartTournamentCommand,
        private readonly phaseService: PhaseService,
        private readonly getAllQuery: GetAllTournamentsQuery,
        private readonly getOneQuery: GetTournamentQuery,
    ) {}

    create(dto: CreateTournamentDto) {
        return this.createCmd.execute(dto);
    }

    // --- New Lifecycle Methods ---

    /**
     * Transitions tournament from REGISTRATION to ONGOING
     * and generates the first set of matches.
     */
    start(id: number) {
        return this.startCmd.execute(id);
    }

    /**
     * Checks if a phase is complete and moves teams to the next phase.
     */
    advancePhase(phaseId: number) {
        return this.phaseService.checkAndAdvance(phaseId);
    }

    // --- Standard CRUD ---

    findAll() {
        return this.getAllQuery.execute();
    }

    findOne(id: number) {
        return this.getOneQuery.execute(id);
    }

    update(id: number, dto: UpdateTournamentDto) {
        return this.updateCmd.execute(id, dto);
    }

    remove(id: number) {
        return this.deleteCmd.execute(id);
    }

    async register(userId: number, tournamentId: number, teamName?: string, memberIds?: number[]) {
        const tournament = await this.tournamentRepo.findOne({
            where: { id: tournamentId },
            relations: ['teams'],
        });
        if (!tournament) throw new NotFoundException('Tournament not found');

        if (tournament.status !== 'REGISTRATION_OPEN') {
            throw new BadRequestException('Tournament registration is not open');
        }

        if (tournament.max_participants && tournament.teams.length >= tournament.max_participants) {
            throw new BadRequestException('Tournament is full');
        }

        const captain = await this.userRepo.findOne({ where: { id: userId } });
        if (!captain) throw new NotFoundException('User not found');

        // Create team
        const team = this.teamRepo.create({
            name: teamName ?? `${captain.username}'s Team`,
            status: TeamStatus.DRAFT,
            captain_id: userId,
            tournament: tournament,
        });

        // Add captain + any specified members
        const members = [captain];
        if (memberIds?.length) {
            const additionalMembers = await this.userRepo.findByIds(memberIds);
            members.push(...additionalMembers);
        }
        team.members = members;

        await this.teamRepo.save(team);
    }
}