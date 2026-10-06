import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tournament, TournamentStatus } from './entities/tournament.entity';
import { CreateTournamentCommand } from './commands/create-tournament.command';
import { UpdateTournamentCommand } from './commands/update-tournament.command';
import { DeleteTournamentCommand } from './commands/delete-tournament.command';
import { StartTournamentCommand } from './commands/start-tournament.command';
import { SetSeedingCommand } from './commands/set-seeding.command';
import { WithdrawTeamCommand } from './commands/withdraw-team.command';
import { GetAllTournamentsQuery } from './queries/get-all-tournaments.query';
import { GetTournamentQuery } from './queries/get-tournament-details.query';
import { GetSeedingQuery } from './queries/get-seeding.query';
import { GetCheckinQuery } from './queries/get-checkin.query';
import { CreateTournamentDto } from './dto/create-tournament.dto';
import { UpdateTournamentDto } from './dto/update-tournament.dto';
import { publicTournament } from '../users/public-views';

@Injectable()
export class TournamentsService {
    constructor(
        private readonly createCmd: CreateTournamentCommand,
        private readonly updateCmd: UpdateTournamentCommand,
        private readonly deleteCmd: DeleteTournamentCommand,
        private readonly startCmd: StartTournamentCommand,
        private readonly setSeedingCmd: SetSeedingCommand,
        private readonly withdrawCmd: WithdrawTeamCommand,
        private readonly getAllQuery: GetAllTournamentsQuery,
        private readonly getOneQuery: GetTournamentQuery,
        private readonly getSeedingQuery: GetSeedingQuery,
        private readonly getCheckinQuery: GetCheckinQuery,
        @InjectRepository(Tournament) private readonly tournamentRepo: Repository<Tournament>,
    ) {}

    /**
     * The read routes are open to anyone. A DRAFT tournament is an admin's work in progress: for
     * everyone else it does not exist (404, like the public share routes).
     */
    private async assertVisible(id: number, includeDrafts: boolean): Promise<void> {
        if (includeDrafts) return;
        const t = await this.tournamentRepo.findOne({ where: { id }, select: ['id', 'status'] });
        if (!t || t.status === TournamentStatus.DRAFT) throw new NotFoundException(`Tournament ${id} not found`);
    }

    async create(dto: CreateTournamentDto) {
        return publicTournament(await this.createCmd.execute(dto));
    }

    // --- Lifecycle ---

    /**
     * Transitions tournament from REGISTRATION to ONGOING
     * and generates the first set of matches.
     */
    start(id: number) {
        return this.startCmd.execute(id);
    }

    async getSeeding(id: number, includeDrafts = false) {
        await this.assertVisible(id, includeDrafts);
        return this.getSeedingQuery.execute(id);
    }

    async getCheckin(id: number, includeDrafts = false) {
        await this.assertVisible(id, includeDrafts);
        return this.getCheckinQuery.execute(id);
    }

    setSeeding(id: number, teamIds: number[]) {
        return this.setSeedingCmd.execute(id, teamIds);
    }

    async getStandings(id: number, includeDrafts = false) {
        await this.assertVisible(id, includeDrafts);
        return this.getOneQuery.standings(id);
    }

    withdrawTeam(id: number, teamId: number) {
        return this.withdrawCmd.execute(id, teamId);
    }

    // --- Standard CRUD ---

    async findAll(includeDrafts = false) {
        const all = await this.getAllQuery.execute();
        return all.filter((t) => includeDrafts || t.status !== TournamentStatus.DRAFT).map(publicTournament);
    }

    async findOne(id: number, includeDrafts = false) {
        await this.assertVisible(id, includeDrafts);
        return publicTournament(await this.getOneQuery.execute(id));
    }

    async update(id: number, dto: UpdateTournamentDto) {
        return publicTournament(await this.updateCmd.execute(id, dto));
    }

    remove(id: number) {
        return this.deleteCmd.execute(id);
    }
}
