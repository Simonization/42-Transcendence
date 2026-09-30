import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Tournament, TournamentStatus } from "../entities/tournament.entity";
import { GetSeedingQuery } from "../queries/get-seeding.query";
import { SeedingView } from "../services/seeding-view";
import { BracketPublisher } from "../services/bracket-publisher.service";

@Injectable()
export class SetSeedingCommand {
    constructor(
        @InjectRepository(Tournament) private repo: Repository<Tournament>,
        private getSeeding: GetSeedingQuery,
        private publisher: BracketPublisher,
    ) {}

    /** Stores the admin's seed order. Allowed only until the tournament starts. */
    async execute(id: number, teamIds: number[]): Promise<SeedingView> {
        const tournament = await this.repo.findOne({ where: { id }, relations: ['teams'] });
        if (!tournament) throw new NotFoundException(`Tournament ${id} not found`);
        if (tournament.status !== TournamentStatus.REGISTRATION_OPEN && tournament.status !== TournamentStatus.DRAFT) {
            throw new BadRequestException('Seeding can only change before the tournament starts.');
        }

        if (new Set(teamIds).size !== teamIds.length) {
            throw new BadRequestException('A team appears more than once in the seeding.');
        }
        const known = new Set((tournament.teams ?? []).map(t => t.id));
        const unknown = teamIds.filter(tid => !known.has(tid));
        if (unknown.length) {
            throw new BadRequestException(`Teams not registered in this tournament: ${unknown.join(', ')}`);
        }

        await this.repo.update(id, { seed_order: teamIds });
        void this.publisher.tournamentChanged(id, 'seeding_changed');
        return this.getSeeding.execute(id);
    }
}
