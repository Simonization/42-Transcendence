import { Injectable } from '@nestjs/common';
import { CreateTournamentCommand } from './commands/create-tournament.command';
import { UpdateTournamentCommand } from './commands/update-tournament.command';
import { DeleteTournamentCommand } from './commands/delete-tournament.command';
import { StartTournamentCommand } from './commands/start-tournament.command';
import { SetSeedingCommand } from './commands/set-seeding.command';
import { WithdrawTeamCommand } from './commands/withdraw-team.command';
import { GetAllTournamentsQuery } from './queries/get-all-tournaments.query';
import { GetTournamentQuery } from './queries/get-tournament-details.query';
import { GetSeedingQuery } from './queries/get-seeding.query';
import { CreateTournamentDto } from './dto/create-tournament.dto';
import { UpdateTournamentDto } from './dto/update-tournament.dto';

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
    ) {}

    create(dto: CreateTournamentDto) {
        return this.createCmd.execute(dto);
    }

    // --- Lifecycle ---

    /**
     * Transitions tournament from REGISTRATION to ONGOING
     * and generates the first set of matches.
     */
    start(id: number) {
        return this.startCmd.execute(id);
    }

    getSeeding(id: number) {
        return this.getSeedingQuery.execute(id);
    }

    setSeeding(id: number, teamIds: number[]) {
        return this.setSeedingCmd.execute(id, teamIds);
    }

    getStandings(id: number) {
        return this.getOneQuery.standings(id);
    }

    withdrawTeam(id: number, teamId: number) {
        return this.withdrawCmd.execute(id, teamId);
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
}
