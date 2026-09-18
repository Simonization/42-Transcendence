import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Tournament } from "../entities/tournament.entity";
import { Repository } from "typeorm";

@Injectable()
export class GetAllTournamentsQuery {
    constructor(@InjectRepository(Tournament) private repo: Repository<Tournament>) {}
    
    async execute() {
        return await this.repo.find({
            // teams and their members are needed for participant counts; without them every
            // list view reports 0.
            relations: ['phases', 'phases.game', 'teams', 'teams.members'],
            order: { createdAt: 'DESC' }
        });
    }
}