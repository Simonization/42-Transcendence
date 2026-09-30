/**
 * Podium and placement of a finished tournament, as pure functions over plain data.
 *
 * There is no third-place match, so the podium is: 1st = the final's winner, 2nd = the final's
 * other team, 3rd = the semi-final losers (up to two teams sharing third). A tournament that
 * ends on a single group / round robin is ranked by that group's table instead.
 */

import { GROUP_PHASE_TYPES } from '../services/bracket-generator.service';

export interface PodiumTeam {
    teamId: number;
    name: string;
}

export interface Podium {
    first: PodiumTeam;
    second: PodiumTeam | null;
    /** The semi-final losers: one team for a group ranking, up to two for a knockout. */
    third: PodiumTeam[];
}

export interface PodiumMatch {
    round_order: number | null;
    status: string;
    team1_id: number | null;
    team2_id: number | null;
    winner_id: number | null;
    winner_next_match_id?: number | null;
}

export interface PodiumPhase {
    order: number;
    type: string;
    matches: PodiumMatch[];
}

/** The rows of one group table, best first (only `teamId` is read). */
export interface PodiumStandings {
    phaseOrder: number;
    groups: { rows: { teamId: number }[] }[];
}

export interface PodiumInput {
    status: string;
    phases: PodiumPhase[];
    /** Group / round-robin tables per phase, as served by the tournament details. */
    standings?: PodiumStandings[];
    /** Seed order, only used to sort teams that share third place. */
    seedOrder?: number[] | null;
}

/** How a team's run ended. `place` is 1-3 when the team made the podium. */
export interface Placement {
    place: 1 | 2 | 3 | null;
    outcome: 'champion' | 'finalist' | 'semifinalist' | 'eliminated' | 'in_progress' | 'registered';
}

const COMPLETED = 'COMPLETED';

export function computePodium(input: PodiumInput, nameOf: (teamId: number) => string): Podium | null {
    if (input.status !== COMPLETED) return null;

    const team = (teamId: number): PodiumTeam => ({ teamId, name: nameOf(teamId) });
    const played = [...input.phases].sort((a, b) => a.order - b.order).filter((p) => p.matches.length > 0);
    const last = played[played.length - 1];
    if (!last) return null;

    if (GROUP_PHASE_TYPES.includes(last.type)) {
        const table = input.standings?.find((s) => s.phaseOrder === last.order);
        // With several groups there is no single ranking to read a podium from.
        if (!table || table.groups.length !== 1) return null;
        const [first, second, third] = table.groups[0].rows;
        if (!first) return null;
        return {
            first: team(first.teamId),
            second: second ? team(second.teamId) : null,
            third: third ? [team(third.teamId)] : [],
        };
    }

    const finalRound = Math.max(...last.matches.map((m) => m.round_order ?? 1));
    const final = last.matches.find((m) => (m.round_order ?? 1) === finalRound && m.winner_next_match_id == null);
    if (!final || final.winner_id == null) return null;

    const opponentOf = (m: PodiumMatch, winnerId: number) =>
        [m.team1_id, m.team2_id].find((id): id is number => id != null && id !== winnerId) ?? null;

    const seedIndex = (id: number) => input.seedOrder?.indexOf(id) ?? -1;
    const bySeed = (a: number, b: number) =>
        (seedIndex(a) < 0 ? Number.MAX_SAFE_INTEGER : seedIndex(a)) -
            (seedIndex(b) < 0 ? Number.MAX_SAFE_INTEGER : seedIndex(b)) || a - b;

    const runnerUp = opponentOf(final, final.winner_id);
    const semiLosers = last.matches
        .filter((m) => (m.round_order ?? 1) === finalRound - 1 && m.status === 'FINISHED' && m.winner_id != null)
        .map((m) => opponentOf(m, m.winner_id!))
        .filter((id): id is number => id != null)
        .sort(bySeed);

    return {
        first: team(final.winner_id),
        second: runnerUp != null ? team(runnerUp) : null,
        third: semiLosers.map(team),
    };
}

/** Where a team ended up. `podium` is the result of {@link computePodium}, null until COMPLETED. */
export function placementOf(status: string, podium: Podium | null, teamId: number): Placement {
    if (podium?.first.teamId === teamId) return { place: 1, outcome: 'champion' };
    if (podium?.second?.teamId === teamId) return { place: 2, outcome: 'finalist' };
    if (podium?.third.some((t) => t.teamId === teamId)) return { place: 3, outcome: 'semifinalist' };
    if (status === COMPLETED) return { place: null, outcome: 'eliminated' };
    if (status === 'ONGOING') return { place: null, outcome: 'in_progress' };
    return { place: null, outcome: 'registered' };
}
