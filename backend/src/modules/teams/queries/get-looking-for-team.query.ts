import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LookingForTeam } from '../entities/looking-for-team.entity';

@Injectable()
export class GetLookingForTeamQuery {
    constructor(
        @InjectRepository(LookingForTeam) private lftRepo: Repository<LookingForTeam>,
    ) {}

    async execute(tournamentId: number): Promise<LookingForTeam[]> {
        return this.lftRepo.find({
            where: { tournamentId },
            relations: ['user'],
            order: { createdAt: 'ASC' },
        });
    }
}
