/**
 * Seeding and pairing, as pure functions.
 *
 * The same functions build the real bracket at start and the preview served by
 * GET /tournaments/:id/seeding, so the preview is the bracket, not an approximation of it.
 */

export interface SeedableTeam {
    id: number;
    status: string;
}

/** Status a team must have to enter the bracket (TeamStatus.LOCKED). */
export const ENTRANT_STATUS = 'LOCKED';

/**
 * The teams that would enter, in seed order: the admin's `seedOrder` first (unknown or
 * non-LOCKED ids skipped), then every other LOCKED team by id.
 */
export function orderEntrants<T extends SeedableTeam>(teams: T[], seedOrder: number[] | null | undefined): T[] {
    const locked = teams.filter((t) => t.status === ENTRANT_STATUS);
    const byId = new Map(locked.map((t) => [t.id, t]));
    const ordered: T[] = [];
    const seen = new Set<number>();

    for (const id of seedOrder ?? []) {
        const team = byId.get(id);
        if (team && !seen.has(id)) {
            ordered.push(team);
            seen.add(id);
        }
    }
    const rest = locked.filter((t) => !seen.has(t.id)).sort((a, b) => a.id - b.id);
    return [...ordered, ...rest];
}

/** Smallest power of two that holds `n` teams, and at least 2. */
export function bracketSize(n: number): number {
    let size = 2;
    while (size < n) size *= 2;
    return size;
}

/**
 * Standard bracket order of seeds for a power-of-two size: for 8 it is
 * [1, 8, 4, 5, 2, 7, 3, 6], read as the pairs 1v8, 4v5, 2v7, 3v6. Seeds 1 and 2 can only meet in
 * the final, and every pair sums to size + 1.
 */
export function seedPositions(size: number): number[] {
    let positions = [1];
    while (positions.length < size) {
        const total = positions.length * 2 + 1;
        positions = positions.flatMap((seed) => [seed, total - seed]);
    }
    return positions;
}

/**
 * First-round pairs, as indexes into the seeded list (0 = seed 1), null for a bye.
 *
 * Seeds above the field size are byes. Because a pair's seeds sum to size + 1 and the field is
 * more than half the size, a pair can hold at most one bye, and byes land on the top seeds.
 */
export function firstRoundPairs(teamCount: number): [number | null, number | null][] {
    const size = bracketSize(teamCount);
    const positions = seedPositions(size);
    const pairs: [number | null, number | null][] = [];
    for (let i = 0; i < positions.length; i += 2) {
        const a = positions[i];
        const b = positions[i + 1];
        pairs.push([a <= teamCount ? a - 1 : null, b <= teamCount ? b - 1 : null]);
    }
    return pairs;
}

/**
 * Splits a seeded list into groups of at most `groupSize` by snake draft (A B C C B A ...), so
 * every group gets one of the top seeds.
 */
export function snakeGroups<T>(seeded: T[], groupSize: number): T[][] {
    const size = Math.max(2, groupSize || 2);
    const count = Math.max(1, Math.ceil(seeded.length / size));
    const groups: T[][] = Array.from({ length: count }, () => []);
    seeded.forEach((item, i) => {
        const lap = Math.floor(i / count);
        const pos = i % count;
        const g = lap % 2 === 0 ? pos : count - 1 - pos;
        groups[g].push(item);
    });
    return groups;
}

/**
 * Round-robin schedule by the circle method: every pair meets exactly once, and nobody plays
 * twice in the same round. With an odd count, one team sits out each round.
 */
export function roundRobinRounds<T>(items: T[]): [T, T][][] {
    const list: (T | null)[] = [...items];
    if (list.length % 2 === 1) list.push(null);
    const n = list.length;
    const rounds: [T, T][][] = [];

    for (let r = 0; r < n - 1; r++) {
        const round: [T, T][] = [];
        for (let i = 0; i < n / 2; i++) {
            const a = list[i];
            const b = list[n - 1 - i];
            if (a !== null && b !== null) round.push([a, b]);
        }
        rounds.push(round);
        // Keep the first element fixed and rotate the rest one step.
        list.splice(1, 0, list.pop() as T | null);
    }
    return rounds;
}

export const groupLabel = (index: number): string => String.fromCharCode(65 + index);
