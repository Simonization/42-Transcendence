import { Injectable } from '@nestjs/common';
import { CreateTournamentCommand } from './commands/create-tournament.command';
import { UpdateTournamentCommand } from './commands/update-tournament.command';
import { DeleteTournamentCommand } from './commands/delete-tournament.command';
import { GetAllTournamentsQuery } from './queries/get-all-tournaments.query';
import { GetTournamentQuery } from './queries/get-tournament-details.query';
import { CreateTournamentDto } from './dto/create-tournament.dto';
import { UpdateTournamentDto } from './dto/update-tournament.dto';

@Injectable()
export class TournamentsService {
    constructor(
        private readonly createCmd: CreateTournamentCommand,
        private readonly updateCmd: UpdateTournamentCommand,
        private readonly deleteCmd: DeleteTournamentCommand,
        private readonly getAllQuery: GetAllTournamentsQuery,
        private readonly getOneQuery: GetTournamentQuery,
    ) {}

    create(dto: CreateTournamentDto) {
        return this.createCmd.execute(dto);
    }

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