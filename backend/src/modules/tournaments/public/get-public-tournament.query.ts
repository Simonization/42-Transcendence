import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tournament, TournamentStatus } from '../entities/tournament.entity';
import { buildPublicTournament, PublicTournament } from './public-tournament.view';

@Injectable()
export class GetPublicTournamentQuery {
    constructor(@InjectRepository(Tournament) private repo: Repository<Tournament>) {}

    /**
     * The anonymous view of a tournament (see public-tournament.view.ts for what it exposes).
     * A DRAFT tournament is an admin's work in progress and is not shareable: it 404s, exactly
     * like an id that does not exist.
     */
    async execute(id: number): Promise<PublicTournament> {
        const tournament = await this.repo.findOne({
            where: { id },
            relations: [
                'phases',
                'phases.game',
                'phases.matches',
                'phases.matches.team1',
                'phases.matches.team2',
                'teams',
                // Only ever counted (the seeding preview's memberCount), never returned.
                'teams.members',
            ],
        });
        if (!tournament || tournament.status === TournamentStatus.DRAFT) throw new NotFoundException();
        return buildPublicTournament(tournament);
    }
}
