import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Tournament } from "../entities/tournament.entity";
import { Repository } from "typeorm";
import { buildSeedingView, SeedingView } from "../services/seeding-view";
import { buildStandingsView, PhaseStandingsView } from "../services/standings-view";

export type TournamentDetails = Tournament & {
    seeding: SeedingView;
    standings: PhaseStandingsView[];
};

@Injectable()
export class GetTournamentQuery {
    constructor(@InjectRepository(Tournament) private repo: Repository<Tournament>) {}

    /**
     * The tournament with its phases, matches (both slots), teams, and two derived views: the
     * seeding (what the bracket preview draws before start) and group standings.
     */
    async execute(id: number): Promise<TournamentDetails> {
        const tournament = await this.repo.findOne({
            where: { id },
            relations: [
                'phases',
                'phases.game',
                // Without the matches the bracket view renders an empty frame.
                'phases.matches',
                'phases.matches.team1',
                'phases.matches.team2',
                'teams',
                'teams.members',
                'teams.admins',
            ]
        });
        if (!tournament) throw new NotFoundException();

        return {
            ...tournament,
            seeding: buildSeedingView(tournament),
            standings: buildStandingsView(tournament, tournament.phases ?? [], (p) => p.matches ?? []),
        } as TournamentDetails;
    }

    async standings(id: number): Promise<PhaseStandingsView[]> {
        return (await this.execute(id)).standings;
    }
}
