import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Tournament } from "../entities/tournament.entity";
import { buildSeedingView, SeedingView } from "../services/seeding-view";

@Injectable()
export class GetSeedingQuery {
    constructor(@InjectRepository(Tournament) private repo: Repository<Tournament>) {}

    async execute(id: number): Promise<SeedingView> {
        const tournament = await this.repo.findOne({
            where: { id },
            relations: ['teams', 'teams.members', 'phases'],
        });
        if (!tournament) throw new NotFoundException(`Tournament ${id} not found`);
        return buildSeedingView(tournament);
    }
}
