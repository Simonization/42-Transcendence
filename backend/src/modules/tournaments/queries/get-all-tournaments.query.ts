import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Tournament } from "../entities/tournament.entity";
import { Repository } from "typeorm";

@Injectable()
export class GetAllTournamentsQuery {
    constructor(@InjectRepository(Tournament) private repo: Repository<Tournament>) {}
    
    async execute() {
        return await this.repo.find({
            relations: ['phases', 'phases.game'], // Load phases and game info
            order: { createdAt: 'DESC' }
        });
    }
}