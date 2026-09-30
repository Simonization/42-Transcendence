import { maxRosterSize, MAX_SUBSTITUTES, orderRoster, substituteIds, teamSizeOf } from './roster';

describe('roster', () => {
    it('allows two substitutes on top of the game team size', () => {
        expect(MAX_SUBSTITUTES).toBe(2);
        expect(maxRosterSize(1)).toBe(3);
        expect(maxRosterSize(5)).toBe(7);
    });

    it('reads the team size from phase 1, defaulting to solo', () => {
        expect(teamSizeOf({ phases: [{ order: 2, game: { teamSize: 9 } }, { order: 1, game: { teamSize: 3 } }] })).toBe(3);
        expect(teamSizeOf({ phases: [] })).toBe(1);
        expect(teamSizeOf(null)).toBe(1);
    });

    it('puts the captain first even when they are not first in the join table', () => {
        const members = [{ id: 4 }, { id: 2 }, { id: 9 }];
        expect(orderRoster(members, 9).map((m) => m.id)).toEqual([9, 4, 2]);
    });

    it('marks everyone past the first teamSize as a substitute, in join order', () => {
        const members = [{ id: 4 }, { id: 2 }, { id: 9 }, { id: 5 }];
        // teamSize 2, captain 9: starters are 9 and 4; 2 and 5 sit on the bench.
        expect([...substituteIds(members, 9, 2)]).toEqual([2, 5]);
        expect(substituteIds(members, 9, 4).size).toBe(0);
    });

    it('promotes the first substitute automatically when a starter leaves', () => {
        const before = [{ id: 1 }, { id: 2 }, { id: 3 }];
        expect([...substituteIds(before, 1, 2)]).toEqual([3]);
        const after = before.filter((m) => m.id !== 2);
        expect(substituteIds(after, 1, 2).size).toBe(0);
    });
});
