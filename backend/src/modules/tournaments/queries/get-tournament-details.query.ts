import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Tournament } from "../entities/tournament.entity";
import { Repository } from "typeorm";

@Injectable()
export class GetTournamentQuery {
    constructor(@InjectRepository(Tournament) private repo: Repository<Tournament>) {}
    
    async execute(id: number) {
        const tournament = await this.repo.findOne({
            where: { id },
            relations: ['phases', 'phases.game', 'teams', 'teams.members']
        });
        if (!tournament) throw new NotFoundException();
        return tournament;
    }
}