/**
 * Roster rules: a team may carry substitutes (the bench) on top of the players a game needs.
 *
 * - `teamSize` starters are required to lock the team;
 * - up to MAX_SUBSTITUTES more members can join (invite, join code, join request);
 * - members beyond the first `teamSize` are the substitutes. There is no per-member flag: the
 *   roster order decides. The captain always starts, everyone else keeps the order they joined
 *   in (the order of the `team_members` rows), so a departing starter is replaced by the first
 *   substitute without anyone touching a toggle.
 */

export const MAX_SUBSTITUTES = 2;

/** The game's team size for a tournament (phase 1's game); solo when nothing is configured. */
export function teamSizeOf(tournament: { phases?: { order: number; game?: { teamSize?: number | null } | null }[] } | null | undefined): number {
    const phase1 = tournament?.phases?.find((p) => p.order === 1);
    return phase1?.game?.teamSize ?? 1;
}

/** Most members a team may hold: the starters plus the bench. */
export const maxRosterSize = (teamSize: number): number => teamSize + MAX_SUBSTITUTES;

/** The captain first, then the other members in join order. */
export function orderRoster<T extends { id: number }>(members: readonly T[], captainId: number): T[] {
    const captain = members.filter((m) => m.id === captainId);
    return [...captain, ...members.filter((m) => m.id !== captainId)];
}

/** Ids of the members who sit on the bench (everyone past the first `teamSize`). */
export function substituteIds(members: readonly { id: number }[], captainId: number, teamSize: number): Set<number> {
    return new Set(orderRoster(members, captainId).slice(teamSize).map((m) => m.id));
}
