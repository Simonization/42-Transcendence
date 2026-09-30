import { computeGroupStandings, groupQualifiers, rankGroup, StandingsMatch } from './standings';

const played = (t1: number, t2: number, s1: number, s2: number, group = 0): StandingsMatch => ({
    team1_id: t1,
    team2_id: t2,
    team1_score: s1,
    team2_score: s2,
    winner_id: s1 > s2 ? t1 : t2,
    status: 'FINISHED',
    group_index: group,
});

const seeds = (...ids: number[]) => new Map(ids.map((id, i) => [id, i + 1]));

describe('standings', () => {
    it('ranks by points first', () => {
        const rows = rankGroup([1, 2, 3], [played(1, 2, 2, 0), played(1, 3, 2, 0), played(2, 3, 2, 1)], seeds(1, 2, 3));
        expect(rows.map((r) => r.teamId)).toEqual([1, 2, 3]);
        expect(rows[0]).toMatchObject({ points: 6, wins: 2, played: 2, rank: 1 });
    });

    it('settles a three-way tie with equal head-to-head on score difference', () => {
        // A cycle: 1 beat 2, 2 beat 3, 3 beat 1. All on 3 points and 3 head-to-head points.
        const matches = [played(1, 2, 1, 0), played(2, 3, 9, 0), played(3, 1, 1, 0)];
        const rows = rankGroup([1, 2, 3], matches, seeds(3, 2, 1));
        // Difference: 2 (+8), 1 (0), 3 (-8).
        expect(rows.map((r) => r.teamId)).toEqual([2, 1, 3]);
    });

    it('uses head-to-head when exactly two teams tie', () => {
        // 1 beats 2 narrowly; 2 thrashes 3; 3 beats 1. 4 loses everything.
        // Points: 1 = 3 (beat 2) + 3 (beat 4) = 6; 2 = 3 (beat 3) + 3 (beat 4) = 6; 3 = 3 (beat 1) + 3 (beat 4) = 6.
        // Make 3 lose to 4 instead so only 1 and 2 tie on 6.
        const matches = [
            played(1, 2, 1, 0),
            played(2, 3, 9, 0),
            played(3, 1, 1, 0),
            played(1, 4, 1, 0),
            played(2, 4, 1, 0),
            played(3, 4, 0, 1),
        ];
        const rows = rankGroup([1, 2, 3, 4], matches, seeds(2, 1, 3, 4));
        // 1 and 2 on 6 points; 2 has the far better difference but 1 won the head-to-head.
        expect(rows.slice(0, 2).map((r) => r.teamId)).toEqual([1, 2]);
    });

    it('falls back to score for, then seed', () => {
        const a = rankGroup([1, 2], [], seeds(2, 1));
        expect(a.map((r) => r.teamId)).toEqual([2, 1]);
    });

    it('ranks withdrawn teams last', () => {
        const rows = rankGroup([1, 2], [played(1, 2, 3, 0)], seeds(1, 2), new Set([1]));
        expect(rows.map((r) => r.teamId)).toEqual([2, 1]);
        expect(rows[1].withdrawn).toBe(true);
    });

    it('builds every group and picks winners before runners-up', () => {
        const matches = [played(1, 4, 2, 0, 0), played(2, 3, 0, 2, 1)];
        const groups = computeGroupStandings(matches, seeds(1, 2, 3, 4));
        expect(groups.map((g) => g.label)).toEqual(['A', 'B']);
        expect(groupQualifiers(groups, 2)).toEqual([1, 3, 4, 2]);
        expect(groupQualifiers(groups, 2, 3)).toEqual([1, 3, 4]);
    });

    it('reads the group from the legacy label', () => {
        const legacy = { ...played(1, 2, 1, 0), group_index: null, game_data: { group: 'B' } };
        expect(computeGroupStandings([legacy], seeds(1, 2))[0].label).toBe('B');
    });
});
