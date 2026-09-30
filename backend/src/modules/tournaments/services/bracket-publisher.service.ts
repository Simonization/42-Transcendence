import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Match } from '../../matches/entities/match.entity';
import { RealtimeService } from '../../realtime/realtime.service';
import { RealtimeEvents } from '../../realtime/realtime.events';
import { MatchChatService } from '../../chat/services/match-chat.service';
import { EngineEvents } from './bracket-engine.service';

interface Announcement {
    tournamentId: number;
    reason: string;
    /** Matches whose own room should hear about it. */
    matchIds?: number[];
    /** Teams whose page should refresh. */
    teamIds?: number[];
    /** Also send `tournament:updated` (start, seeding, completion, reopening). */
    tournamentUpdated?: boolean;
    events?: EngineEvents;
}

/**
 * Everything the bracket commands do after their transaction commits, apart from notifications:
 * tell the clients over the realtime layer and create the chat of each match that just became
 * READY. One call per command keeps the call sites to a line; the reasons are documented in
 * docs/realtime.md. Never throws, so it can be called without awaiting.
 */
@Injectable()
export class BracketPublisher {
    private readonly logger = new Logger(BracketPublisher.name);

    constructor(
        private readonly realtime: RealtimeService,
        private readonly matchChat: MatchChatService,
        @InjectRepository(Match) private readonly matchRepo: Repository<Match>,
    ) {}

    /** A match changed (report, confirm, dispute, resolve, undo, edit) and the bracket with it. */
    async matchChanged(matchId: number, reason: string, events?: EngineEvents, tournamentUpdated = false): Promise<void> {
        try {
            const match = await this.matchRepo.findOne({ where: { id: matchId } });
            if (!match) return;
            await this.announce({
                tournamentId: match.tournament_id,
                reason,
                matchIds: [matchId],
                teamIds: [match.team1_id, match.team2_id].filter((id): id is number => id != null),
                tournamentUpdated,
                events,
            });
        } catch (err) {
            this.logger.warn(`Could not publish match ${matchId} (${reason}): ${(err as Error)?.message ?? err}`);
        }
    }

    /** The tournament itself changed: started, seeding changed, or a team withdrew. */
    async tournamentChanged(
        tournamentId: number,
        reason: string,
        events?: EngineEvents,
        extra: { matchIds?: number[]; teamIds?: number[] } = {},
    ): Promise<void> {
        try {
            await this.announce({ tournamentId, reason, tournamentUpdated: true, events, ...extra });
        } catch (err) {
            this.logger.warn(`Could not publish tournament ${tournamentId} (${reason}): ${(err as Error)?.message ?? err}`);
        }
    }

    private async announce(a: Announcement): Promise<void> {
        const { tournamentId, reason } = a;
        const ready = a.events?.readyMatchIds ?? [];
        const completed = a.events?.completedTournamentId != null;

        for (const id of new Set([...(a.matchIds ?? []), ...ready])) {
            this.realtime.toMatch(id, RealtimeEvents.MATCH_UPDATED, { id, reason });
        }
        this.realtime.toTournament(tournamentId, RealtimeEvents.BRACKET_UPDATED, { id: tournamentId, reason });
        if (a.tournamentUpdated || completed) {
            this.realtime.toTournament(tournamentId, RealtimeEvents.TOURNAMENT_UPDATED, {
                id: tournamentId,
                reason: completed ? 'tournament_completed' : reason,
            });
        }

        // A match that just became READY gets its chat first, so a team page that refreshes on
        // the event already finds it.
        await this.matchChat.ensureRooms(ready);

        const teamIds = new Set(a.teamIds ?? []);
        if (ready.length) {
            const rows = await this.matchRepo.find({ where: { id: In(ready) } });
            for (const m of rows) {
                if (m.team1_id != null) teamIds.add(m.team1_id);
                if (m.team2_id != null) teamIds.add(m.team2_id);
            }
        }
        for (const id of teamIds) {
            this.realtime.toTeam(id, RealtimeEvents.TEAM_UPDATED, { id, reason });
        }
    }
}
