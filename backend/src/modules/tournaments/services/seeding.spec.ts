import {
    bracketSize,
    firstRoundPairs,
    orderEntrants,
    roundRobinRounds,
    seedPositions,
    snakeGroups,
} from './seeding';

describe('seeding', () => {
    describe('seedPositions', () => {
        it('uses standard bracket order', () => {
            expect(seedPositions(2)).toEqual([1, 2]);
            expect(seedPositions(4)).toEqual([1, 4, 2, 3]);
            expect(seedPositions(8)).toEqual([1, 8, 4, 5, 2, 7, 3, 6]);
        });

        it('pairs seeds that sum to size + 1', () => {
            const p = seedPositions(16);
            for (let i = 0; i < p.length; i += 2) expect(p[i] + p[i + 1]).toBe(17);
        });
    });

    describe('firstRoundPairs', () => {
        for (let n = 2; n <= 9; n++) {
            it(`seeds ${n} teams with no empty match and byes only to the top seeds`, () => {
                const pairs = firstRoundPairs(n);
                const size = bracketSize(n);
                expect(pairs).toHaveLength(size / 2);

                // No match without a team, and never two byes in one match.
                for (const [a, b] of pairs) expect(a !== null || b !== null).toBe(true);

                // Every team exactly once.
                const seen = pairs.flat().filter((x): x is number => x !== null).sort((a, b) => a - b);
                expect(seen).toEqual(Array.from({ length: n }, (_, i) => i));

                // Byes: size - n of them, each facing one of the top (size - n) seeds.
                const byeOpponents = pairs
                    .filter(([a, b]) => a === null || b === null)
                    .map(([a, b]) => (a ?? b) as number)
                    .sort((x, y) => x - y);
                expect(byeOpponents).toEqual(Array.from({ length: size - n }, (_, i) => i));
            });
        }

        it('pairs 1 v N in the first match', () => {
            expect(firstRoundPairs(8)[0]).toEqual([0, 7]);
            expect(firstRoundPairs(5)).toEqual([
                [0, null],
                [3, 4],
                [1, null],
                [2, null],
            ]);
        });
    });

    describe('orderEntrants', () => {
        const teams = [
            { id: 3, status: 'LOCKED' },
            { id: 1, status: 'LOCKED' },
            { id: 2, status: 'DRAFT' },
            { id: 4, status: 'LOCKED' },
        ];

        it('keeps only LOCKED teams, by id without a seed order', () => {
            expect(orderEntrants(teams, null).map((t) => t.id)).toEqual([1, 3, 4]);
        });

        it('follows the admin order, then the rest by id, skipping DRAFT and unknown ids', () => {
            expect(orderEntrants(teams, [4, 2, 99, 4]).map((t) => t.id)).toEqual([4, 1, 3]);
        });
    });

    describe('snakeGroups', () => {
        it('spreads the top seeds across groups', () => {
            expect(snakeGroups([1, 2, 3, 4, 5, 6, 7, 8], 4)).toEqual([
                [1, 4, 5, 8],
                [2, 3, 6, 7],
            ]);
        });

        it('makes one group when the field fits', () => {
            expect(snakeGroups([1, 2, 3], 4)).toEqual([[1, 2, 3]]);
        });
    });

    describe('roundRobinRounds', () => {
        for (const n of [2, 3, 4, 5, 6]) {
            it(`schedules every pair once for ${n} teams, nobody twice per round`, () => {
                const rounds = roundRobinRounds(Array.from({ length: n }, (_, i) => i));
                const pairs = rounds.flat().map(([a, b]) => [Math.min(a, b), Math.max(a, b)].join('-'));
                expect(new Set(pairs).size).toBe((n * (n - 1)) / 2);
                expect(pairs).toHaveLength((n * (n - 1)) / 2);
                for (const round of rounds) {
                    const ids = round.flat();
                    expect(new Set(ids).size).toBe(ids.length);
                }
            });
        }
    });
});
