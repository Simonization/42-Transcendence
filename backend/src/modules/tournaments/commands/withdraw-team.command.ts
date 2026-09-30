import { Injectable, NotFoundException } from "@nestjs/common";
import { DataSource } from "typeorm";
import { Tournament } from "../entities/tournament.entity";
import { BracketEngine, newEvents } from "../services/bracket-engine.service";
import { MatchNotifier } from "../services/match-notifier.service";

@Injectable()
export class WithdrawTeamCommand {
    constructor(
        private dataSource: DataSource,
        private engine: BracketEngine,
        private notifier: MatchNotifier,
    ) {}

    /** Admin: the team forfeits its remaining match(es); opponents win by walkover. */
    async execute(tournamentId: number, teamId: number) {
        const events = newEvents();

        const matches = await this.dataSource.transaction(async (manager) => {
            const tournament = await manager.findOne(Tournament, {
                where: { id: tournamentId },
                lock: { mode: 'pessimistic_write' },
            });
            if (!tournament) throw new NotFoundException(`Tournament ${tournamentId} not found`);
            return this.engine.withdrawTeam(manager, tournament, teamId, events);
        });

        this.notifier.dispatch(this.notifier.matchesReady(events.readyMatchIds));
        return { teamId, matchIds: matches.map(m => m.id), tournamentCompleted: events.completedTournamentId !== null };
    }
}
