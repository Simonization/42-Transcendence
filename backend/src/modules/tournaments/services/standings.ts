/**
 * Group / round-robin standings, as pure functions.
 *
 * Ranking: points (3 per win; elimination-style scoring has no draws) -> head-to-head points
 * among the tied teams -> score difference -> score for -> seed. Every step is deterministic,
 * so the same results always produce the same table and the same qualifiers.
 */

import { groupLabel } from './seeding';

export const POINTS_PER_WIN = 3;

export interface StandingsMatch {
    team1_id: number | null;
    team2_id: number | null;
    team1_score: number | null;
    team2_score: number | null;
    winner_id: number | null;
    status: string;
    group_index?: number | null;
    game_data?: any;
}

export interface StandingRow {
    teamId: number;
    rank: number;
    played: number;
    wins: number;
    losses: number;
    points: number;
    scoreFor: number;
    scoreAgainst: number;
    scoreDiff: number;
    seed: number | null;
    withdrawn: boolean;
}

export interface GroupStandings {
    index: number;
    label: string;
    rows: StandingRow[];
}

export function groupIndexOf(match: StandingsMatch): number {
    if (match.group_index !== null && match.group_index !== undefined) return match.group_index;
    // Matches generated before group_index existed carried only the label.
    const label = match.game_data?.group;
    if (typeof label === 'string' && label.length === 1) return label.charCodeAt(0) - 65;
    return 0;
}

const isFinished = (m: StandingsMatch) => m.status === 'FINISHED' && m.winner_id != null;

function emptyRow(teamId: number, seed: number | null, withdrawn: boolean): StandingRow {
    return {
        teamId, rank: 0, played: 0, wins: 0, losses: 0, points: 0,
        scoreFor: 0, scoreAgainst: 0, scoreDiff: 0, seed, withdrawn,
    };
}

function headToHeadPoints(teamIds: number[], matches: StandingsMatch[]): Map<number, number> {
    const set = new Set(teamIds);
    const points = new Map<number, number>(teamIds.map((id) => [id, 0]));
    for (const m of matches) {
        if (!isFinished(m) || !set.has(m.team1_id!) || !set.has(m.team2_id!)) continue;
        points.set(m.winner_id!, (points.get(m.winner_id!) ?? 0) + POINTS_PER_WIN);
    }
    return points;
}

/** Ranks one group's teams. `matches` must all belong to that group. */
export function rankGroup(
    teamIds: number[],
    matches: StandingsMatch[],
    seedOf: Map<number, number>,
    withdrawn: Set<number> = new Set(),
): StandingRow[] {
    const rows = new Map<number, StandingRow>(
        teamIds.map((id) => [id, emptyRow(id, seedOf.get(id) ?? null, withdrawn.has(id))]),
    );

    for (const m of matches) {
        if (!isFinished(m) || m.team1_id == null || m.team2_id == null) continue;
        const sides: [number, number | null, number | null][] = [
            [m.team1_id, m.team1_score, m.team2_score],
            [m.team2_id, m.team2_score, m.team1_score],
        ];
        for (const [teamId, forScore, againstScore] of sides) {
            const row = rows.get(teamId);
            if (!row) continue;
            row.played += 1;
            if (m.winner_id === teamId) {
                row.wins += 1;
                row.points += POINTS_PER_WIN;
            } else {
                row.losses += 1;
            }
            // Walkovers carry no score; they count as a result but not towards the difference.
            row.scoreFor += forScore ?? 0;
            row.scoreAgainst += againstScore ?? 0;
        }
    }
    for (const row of rows.values()) row.scoreDiff = row.scoreFor - row.scoreAgainst;

    const bySeed = (a: StandingRow, b: StandingRow) =>
        (a.seed ?? Number.MAX_SAFE_INTEGER) - (b.seed ?? Number.MAX_SAFE_INTEGER) || a.teamId - b.teamId;

    // Withdrawn teams rank last whatever their record, so they can never qualify.
    const active = [...rows.values()].filter((r) => !r.withdrawn);
    const out = [...rows.values()].filter((r) => r.withdrawn).sort(bySeed);

    const byPoints = new Map<number, StandingRow[]>();
    for (const row of active) byPoints.set(row.points, [...(byPoints.get(row.points) ?? []), row]);

    const ranked: StandingRow[] = [];
    for (const points of [...byPoints.keys()].sort((a, b) => b - a)) {
        const tied = byPoints.get(points)!;
        const h2h = tied.length > 1 ? headToHeadPoints(tied.map((r) => r.teamId), matches) : new Map();
        tied.sort(
            (a, b) =>
                (h2h.get(b.teamId) ?? 0) - (h2h.get(a.teamId) ?? 0) ||
                b.scoreDiff - a.scoreDiff ||
                b.scoreFor - a.scoreFor ||
                bySeed(a, b),
        );
        ranked.push(...tied);
    }

    return [...ranked, ...out].map((row, i) => ({ ...row, rank: i + 1 }));
}

/** Standings for every group of a phase, including teams that have not played yet. */
export function computeGroupStandings(
    matches: StandingsMatch[],
    seedOf: Map<number, number>,
    withdrawn: Set<number> = new Set(),
): GroupStandings[] {
    const byGroup = new Map<number, StandingsMatch[]>();
    for (const m of matches) {
        const g = groupIndexOf(m);
        byGroup.set(g, [...(byGroup.get(g) ?? []), m]);
    }

    return [...byGroup.keys()]
        .sort((a, b) => a - b)
        .map((index) => {
            const groupMatches = byGroup.get(index)!;
            const teamIds = [
                ...new Set(
                    groupMatches.flatMap((m) => [m.team1_id, m.team2_id]).filter((id): id is number => id != null),
                ),
            ];
            return { index, label: groupLabel(index), rows: rankGroup(teamIds, groupMatches, seedOf, withdrawn) };
        });
}

/**
 * Qualifiers in seed order for the next phase: every group's winner (A, B, ...), then every
 * runner-up, and so on, which gives the standard cross-over (A1 v B2, B1 v A2) when fed into
 * the knockout seeding. `limit` caps the total.
 */
export function groupQualifiers(groups: GroupStandings[], perGroup: number, limit?: number | null): number[] {
    const out: number[] = [];
    for (let place = 0; place < perGroup; place++) {
        for (const group of groups) {
            const row = group.rows.filter((r) => !r.withdrawn)[place];
            if (row) out.push(row.teamId);
        }
    }
    return limit ? out.slice(0, limit) : out;
}
