import { Repository } from "typeorm";
import { Tournament } from "../entities/tournament.entity";
import { InjectRepository } from "@nestjs/typeorm";
import { Injectable, NotFoundException } from "@nestjs/common";

@Injectable()
export class DeleteTournamentCommand {
    constructor(@InjectRepository(Tournament) private repo: Repository<Tournament>) {}
    
    async execute(id: number) {
        const result = await this.repo.delete(id);
        if (result.affected === 0) throw new NotFoundException();
    }
}