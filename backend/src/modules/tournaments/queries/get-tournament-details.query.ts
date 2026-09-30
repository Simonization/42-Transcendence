import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Tournament } from "../entities/tournament.entity";
import { Repository } from "typeorm";
import { buildSeedingView, SeedingView } from "../services/seeding-view";
import { buildStandingsView, PhaseStandingsView } from "../services/standings-view";
import { computePodium, Podium } from "../public/podium";

export type TournamentDetails = Tournament & {
    seeding: SeedingView;
    standings: PhaseStandingsView[];
    /** Final ranking once COMPLETED, else null. */
    podium: Podium | null;
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

        const phases = tournament.phases ?? [];
        const standings = buildStandingsView(tournament, phases, (p) => p.matches ?? []);
        const names = new Map((tournament.teams ?? []).map((t) => [t.id, t.name]));
        const podium = computePodium(
            {
                status: tournament.status,
                phases: phases.map((p) => ({ order: p.order, type: p.type, matches: p.matches ?? [] })),
                standings,
                seedOrder: tournament.seed_order,
            },
            (id) => names.get(id) ?? `#${id}`,
        );

        return {
            ...tournament,
            seeding: buildSeedingView(tournament),
            standings,
            podium,
        } as TournamentDetails;
    }

    async standings(id: number): Promise<PhaseStandingsView[]> {
        return (await this.execute(id)).standings;
    }
}
