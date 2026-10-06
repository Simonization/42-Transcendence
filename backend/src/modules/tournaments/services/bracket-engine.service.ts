import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { EntityManager, In } from 'typeorm';
import { Match, MatchStatus, SETTLED_MATCH_STATUSES } from '../../matches/entities/match.entity';
import { Team, TeamStatus } from '../../teams/entities/team.entity';
import { Tournament, TournamentStatus } from '../entities/tournament.entity';
import { TournamentPhase } from '../entities/tournament-phase.entity';
import { BracketGeneratorService, GROUP_PHASE_TYPES } from './bracket-generator.service';
import { computeGroupStandings, groupQualifiers } from './standings';

/** What happened during one operation, for the notifications sent after commit. */
export interface EngineEvents {
    /** Matches that became READY (both teams known, nothing reported yet). */
    readyMatchIds: number[];
    completedTournamentId: number | null;
}

export const newEvents = (): EngineEvents => ({ readyMatchIds: [], completedTournamentId: null });

export interface MatchScores {
    team1: number | null;
    team2: number | null;
}

const isSettled = (m: Match) => SETTLED_MATCH_STATUSES.includes(m.status);

/*
 * Locking. Every operation that changes a bracket runs in one transaction and takes row locks in
 * the same order, so two of them can never deadlock: the tournament row first, then match rows.
 * Callers (MatchFlowService, WithdrawTeamCommand, StartTournamentCommand) lock the tournament
 * before anything else; the engine re-locks it where it needs it (a no-op inside the same
 * transaction) and locks each match it reads to change. After taking a lock it reads the row
 * again, so it acts on what a concurrent transaction committed, not on a stale copy.
 */

/** SELECT ... FOR UPDATE on a tournament row. */
export function lockTournament(manager: EntityManager, id: number): Promise<Tournament | null> {
    return manager.findOne(Tournament, { where: { id }, lock: { mode: 'pessimistic_write' } });
}

/** SELECT ... FOR UPDATE on a match row. */
export function lockMatch(manager: EntityManager, id: number): Promise<Match | null> {
    return manager.findOne(Match, { where: { id }, lock: { mode: 'pessimistic_write' } });
}

/**
 * The bracket's state machine: finishing a match, moving its winner into the right slot of the
 * next match, resolving byes and walkovers, closing a phase (next phase or tournament complete),
 * and undoing a result.
 *
 * Every method takes the EntityManager of the caller's transaction, so one request is one
 * transaction: a failure anywhere (including phase advancement) rolls the whole thing back.
 */
@Injectable()
export class BracketEngine {
    constructor(private readonly generator: BracketGeneratorService) {}

    /** Generates a phase's matches for a seeded field and advances its byes. */
    async startPhase(
        manager: EntityManager,
        tournamentId: number,
        phase: TournamentPhase,
        seeded: Team[],
        events: EngineEvents,
    ): Promise<Match[]> {
        const matches = await this.generator.generate(manager, phase, seeded, tournamentId);
        for (const m of matches) {
            if (m.status === MatchStatus.READY) events.readyMatchIds.push(m.id);
        }
        for (const m of matches) {
            if (m.status === MatchStatus.BYE) await this.advanceWinner(manager, m, events);
        }
        return matches;
    }

    /**
     * Records a result and moves the bracket on. `winnerId` must be one of the match's two teams;
     * scores are null for a walkover.
     */
    async finishMatch(
        manager: EntityManager,
        match: Match,
        winnerId: number,
        scores: MatchScores,
        events: EngineEvents,
    ): Promise<Match> {
        if (isSettled(match)) throw new ConflictException('This match is already settled.');
        if (match.team1_id == null || match.team2_id == null) {
            throw new BadRequestException('Both teams must be known before the match can finish.');
        }
        if (winnerId !== match.team1_id && winnerId !== match.team2_id) {
            throw new BadRequestException('The winner must be one of the two teams of this match.');
        }

        match.status = MatchStatus.FINISHED;
        match.winner_id = winnerId;
        match.team1_score = scores.team1;
        match.team2_score = scores.team2;
        match.score = scores.team1 != null && scores.team2 != null ? `${scores.team1}-${scores.team2}` : null;
        match.finished_at = new Date();
        await manager.save(Match, match);

        await this.advanceWinner(manager, match, events);
        await this.checkPhase(manager, match.phase_id, events);
        return match;
    }

    /** Writes a finished match's winner into its slot of the next match. */
    async advanceWinner(manager: EntityManager, match: Match, events: EngineEvents): Promise<void> {
        if (!match.winner_next_match_id || match.winner_id == null) return;

        // Locked: two feeders finishing at the same time would otherwise both read the next
        // match with one empty slot, and the second write would leave it WAITING for ever.
        const next = await lockMatch(manager, match.winner_next_match_id);
        if (!next) return;
        if (isSettled(next)) {
            throw new ConflictException('The next match is already settled; undo it first.');
        }

        if (match.winner_next_match_slot === 2) next.team2_id = match.winner_id;
        else next.team1_id = match.winner_id;
        await manager.save(Match, next);

        await this.onSlotsChanged(manager, next, events);
    }

    /** A match whose second team just arrived is READY, or a walkover if one side withdrew. */
    private async onSlotsChanged(manager: EntityManager, match: Match, events: EngineEvents): Promise<void> {
        if (match.status !== MatchStatus.WAITING) return;
        if (match.team1_id == null || match.team2_id == null) {
            await this.byeIfUnfillable(manager, match, events);
            return;
        }

        const withdrawn = match.game_data?.withdrawn_team_id;
        if (withdrawn === match.team1_id || withdrawn === match.team2_id) {
            const winner = withdrawn === match.team1_id ? match.team2_id : match.team1_id;
            match.game_data = { ...(match.game_data ?? {}), walkover: true };
            await this.finishMatch(manager, match, winner, { team1: null, team2: null }, events);
            return;
        }

        match.status = MatchStatus.READY;
        await manager.save(Match, match);
        events.readyMatchIds.push(match.id);
    }

    /**
     * A match holding one team whose other slot can no longer be filled (every match feeding
     * that slot settled without a winner, i.e. CANCELLED) is a bye: the lone team moves on.
     * The current generator never produces this; brackets carried over from the old engine do
     * (see the LegacyBracketRepair migration, which applies the same rule).
     */
    private async byeIfUnfillable(manager: EntityManager, match: Match, events: EngineEvents): Promise<void> {
        const lone = match.team1_id ?? match.team2_id;
        if (lone == null) return;
        const emptySlot = match.team1_id == null ? 1 : 2;
        const feeders = (await manager.find(Match, { where: { winner_next_match_id: match.id } })).filter(
            (f) => (f.winner_next_match_slot ?? 1) === emptySlot,
        );
        if (!feeders.length || !feeders.every((f) => isSettled(f) && f.winner_id == null)) return;

        match.status = MatchStatus.BYE;
        match.winner_id = lone;
        match.finished_at = new Date();
        await manager.save(Match, match);
        await this.advanceWinner(manager, match, events);
    }

    /**
     * Closes the phase once every match is settled: seeds and generates the next phase, or
     * completes the tournament after the last one. A no-op for a phase that is not the active one,
     * which makes it safe to call more than once.
     */
    async checkPhase(manager: EntityManager, phaseId: number, events: EngineEvents): Promise<void> {
        const phase = await manager.findOne(TournamentPhase, { where: { id: phaseId } });
        if (!phase) return;
        // Lock the tournament before reading the matches: when the last two matches of a phase
        // finish concurrently, the second transaction waits here until the first commits, then
        // sees both settled. Without it each saw the other still open and nobody closed the phase.
        const tournament = await lockTournament(manager, phase.tournament_id);
        const matches = await manager.find(Match, { where: { phase_id: phaseId } });
        if (!matches.length || matches.some((m) => !isSettled(m))) return;

        if (!tournament || tournament.status !== TournamentStatus.ONGOING) return;
        if (tournament.active_phase_id !== phaseId) return;

        const phases = await manager.find(TournamentPhase, { where: { tournament_id: tournament.id } });
        const next = phases.find((p) => p.order === phase.order + 1);
        const qualifierIds = next ? this.qualifiers(phase, matches, tournament) : [];

        if (!next || qualifierIds.length < 2) {
            await this.completeTournament(manager, tournament, events);
            return;
        }

        const teams = await manager.find(Team, { where: { id: In(qualifierIds) } });
        const seeded = qualifierIds
            .map((id) => teams.find((t) => t.id === id))
            .filter((t): t is Team => !!t);

        tournament.active_phase_id = next.id;
        tournament.current_phase_order = next.order;
        await manager.update(Tournament, tournament.id, {
            active_phase_id: next.id,
            current_phase_order: next.order,
        });
        await this.startPhase(manager, tournament.id, next, seeded, events);
    }

    /** The teams that go through to the next phase, best first. */
    qualifiers(phase: TournamentPhase, matches: Match[], tournament: Tournament): number[] {
        const seedOf = new Map<number, number>((tournament.seed_order ?? []).map((id, i) => [id, i + 1]));
        const withdrawn = withdrawnTeamIds(matches);

        if (GROUP_PHASE_TYPES.includes(phase.type)) {
            const groups = computeGroupStandings(matches, seedOf, withdrawn);
            const perGroup =
                phase.type === 'ROUND_ROBIN' ? phase.teams_limit_end || 1 : phase.group_winners_count || 1;
            return groupQualifiers(groups, perGroup, phase.teams_limit_end);
        }

        // Knockout: rank by how far each team got (champion first), then seed.
        const reached = new Map<number, number>();
        for (const m of matches) {
            for (const id of [m.team1_id, m.team2_id]) {
                if (id == null) continue;
                const depth = m.winner_id === id && !m.winner_next_match_id ? Infinity : m.round_order ?? 0;
                reached.set(id, Math.max(reached.get(id) ?? 0, depth));
            }
        }
        return [...reached.keys()]
            .filter((id) => !withdrawn.has(id))
            .sort(
                (a, b) =>
                    reached.get(b)! - reached.get(a)! ||
                    (seedOf.get(a) ?? Number.MAX_SAFE_INTEGER) - (seedOf.get(b) ?? Number.MAX_SAFE_INTEGER),
            )
            .slice(0, phase.teams_limit_end || 1);
    }

    async completeTournament(manager: EntityManager, tournament: Tournament, events: EngineEvents): Promise<void> {
        tournament.status = TournamentStatus.COMPLETED;
        tournament.finished_at = new Date();
        await manager.update(Tournament, tournament.id, {
            status: TournamentStatus.COMPLETED,
            finished_at: tournament.finished_at,
        });

        const teams = await manager.find(Team, { where: { tournament: { id: tournament.id } } });
        if (teams.length) {
            await manager.update(Team, { id: In(teams.map((t) => t.id)) }, { status: TeamStatus.ARCHIVED });
        }
        events.completedTournamentId = tournament.id;
    }

    /**
     * Reverts a finished match to READY. Refused once the match its winner went into has been
     * reported or finished (undo that one first), or once a later phase has started.
     */
    async undoMatch(manager: EntityManager, match: Match): Promise<Match> {
        if (match.status !== MatchStatus.FINISHED) {
            throw new BadRequestException('Only a finished match can be undone.');
        }

        const phase = await manager.findOne(TournamentPhase, { where: { id: match.phase_id } });
        const tournament = phase ? await lockTournament(manager, phase.tournament_id) : null;
        if (!phase || !tournament) throw new NotFoundException('Tournament not found for this match.');
        if (tournament.active_phase_id !== match.phase_id) {
            throw new ConflictException('A later phase has already started; this result is final.');
        }

        if (match.winner_next_match_id) {
            const next = await lockMatch(manager, match.winner_next_match_id);
            if (next) {
                const untouched =
                    [MatchStatus.WAITING, MatchStatus.READY, MatchStatus.ONGOING].includes(next.status) &&
                    next.reported_by_team_id == null;
                if (!untouched) {
                    throw new ConflictException(
                        'The next match has already been reported or played; undo that one first.',
                    );
                }
                if (match.winner_next_match_slot === 2) next.team2_id = null;
                else next.team1_id = null;
                next.status = MatchStatus.WAITING;
                await manager.save(Match, next);
            }
        }

        const withdrawnId = match.game_data?.walkover ? match.game_data?.withdrawn_team_id : null;
        if (withdrawnId != null) {
            // Undoing a walkover puts the withdrawn team back in.
            const { walkover, withdrawn_team_id, ...rest } = match.game_data;
            match.game_data = rest;
            await manager.update(Team, { id: withdrawnId }, { status: TeamStatus.LOCKED });
        }

        match.status = match.team1_id != null && match.team2_id != null ? MatchStatus.READY : MatchStatus.WAITING;
        match.winner_id = null;
        match.team1_score = null;
        match.team2_score = null;
        match.score = null;
        match.reported_by_team_id = null;
        match.reported_at = null;
        match.finished_at = null;
        await manager.save(Match, match);

        if (tournament.status === TournamentStatus.COMPLETED) {
            await manager.update(Tournament, tournament.id, {
                status: TournamentStatus.ONGOING,
                finished_at: null,
            });
            // Completion archived every team; bring back the ones still in the bracket.
            const all = await manager.find(Match, { where: { tournament_id: tournament.id } });
            const out = withdrawnTeamIds(all);
            const playing = new Set<number>();
            for (const m of all) {
                for (const id of [m.team1_id, m.team2_id]) if (id != null && !out.has(id)) playing.add(id);
            }
            if (playing.size) {
                await manager.update(Team, { id: In([...playing]) }, { status: TeamStatus.LOCKED });
            }
        }

        return match;
    }

    /**
     * Withdraws a team from a running tournament: each of its unsettled matches in the active
     * phase goes to the opponent as a walkover (no scores). A match still waiting for the
     * opponent is marked, and becomes a walkover when the opponent arrives.
     */
    async withdrawTeam(
        manager: EntityManager,
        tournament: Tournament,
        teamId: number,
        events: EngineEvents,
    ): Promise<Match[]> {
        if (tournament.status !== TournamentStatus.ONGOING) {
            throw new BadRequestException('Teams can only be withdrawn from a running tournament.');
        }

        const team = await manager.findOne(Team, { where: { id: teamId, tournament: { id: tournament.id } } });
        if (!team) throw new NotFoundException('This team is not in this tournament.');

        const phaseMatches = await manager.find(Match, { where: { phase_id: tournament.active_phase_id } });
        const pending = phaseMatches.filter(
            (m) => !isSettled(m) && (m.team1_id === teamId || m.team2_id === teamId),
        );
        if (!pending.length) {
            throw new BadRequestException('This team has no match left to play.');
        }

        team.status = TeamStatus.ARCHIVED;
        await manager.update(Team, { id: teamId }, { status: TeamStatus.ARCHIVED });

        for (const { id } of pending) {
            // Re-read under lock: finishing an earlier walkover may have moved this match on
            // already, and a captain may be confirming it right now.
            const m = await lockMatch(manager, id);
            if (!m || isSettled(m)) continue;
            m.game_data = { ...(m.game_data ?? {}), withdrawn_team_id: teamId };
            const opponent = m.team1_id === teamId ? m.team2_id : m.team1_id;
            if (opponent == null) {
                await manager.save(Match, m);
                continue;
            }
            m.game_data.walkover = true;
            await this.finishMatch(manager, m, opponent, { team1: null, team2: null }, events);
        }
        return pending;
    }
}

/** Teams that withdrew, read off the walkover markers on their matches. */
export function withdrawnTeamIds(matches: Match[]): Set<number> {
    const out = new Set<number>();
    for (const m of matches) {
        const id = m.game_data?.withdrawn_team_id;
        if (typeof id === 'number') out.add(id);
    }
    return out;
}
