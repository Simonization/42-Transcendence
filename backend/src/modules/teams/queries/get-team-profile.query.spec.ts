import { NotFoundException } from '@nestjs/common';
import { GetTeamProfileQuery } from './get-team-profile.query';

const user = (id: number) => ({
    id, username: `user${id}`, mail: 'private@example.org', passwordHash: 'x', avatarUrl: null,
});

const mk = (over: any) => ({
    phase_id: 1, round_order: 1, status: 'FINISHED', team1_id: null, team2_id: null, team1: null, team2: null,
    team1_score: null, team2_score: null, winner_id: null, winner_next_match_id: null, game_data: {},
    finished_at: new Date('2026-09-01'), ...over,
});

describe('GetTeamProfileQuery', () => {
    const alpha = { id: 1, name: 'Alpha' };
    const bravo = { id: 2, name: 'Bravo' };
    const charlie = { id: 3, name: 'Charlie' };
    const delta = { id: 4, name: 'Delta' };

    const tournament = (status = 'COMPLETED') => ({
        id: 9, name: 'Cup', status, seed_order: [1, 2, 3, 4],
        teams: [alpha, bravo, charlie, delta],
        phases: [{
            id: 1, order: 1, type: 'SINGLE_ELIMINATION',
            matches: [
                mk({ id: 1, team1_id: 1, team2_id: 4, team1: alpha, team2: delta, team1_score: 2, team2_score: 1, winner_id: 1, winner_next_match_id: 3 }),
                mk({ id: 2, team1_id: 2, team2_id: 3, team1: bravo, team2: charlie, team1_score: 0, team2_score: 2, winner_id: 3, winner_next_match_id: 3 }),
                mk({ id: 3, round_order: 2, team1_id: 1, team2_id: 3, team1: alpha, team2: charlie, team1_score: 0, team2_score: 2, winner_id: 3 }),
                mk({ id: 4, round_order: 1, status: 'BYE', team1_id: 1, team2_id: null, team1: alpha, winner_id: 1 }),
            ],
        }],
    });

    const build = (teamId: number, status = 'COMPLETED', captainId = 1) => {
        const team = {
            id: teamId, name: teamId === 1 ? 'Alpha' : 'Delta', status: 'ARCHIVED', captain_id: captainId,
            members: [user(5), user(1), user(6), user(7)],
            tournament: {
                id: 9, name: 'Cup', status,
                phases: [{ order: 1, game: { teamSize: 2 } }],
            },
        };
        return new GetTeamProfileQuery(
            { findOne: jest.fn().mockResolvedValue(teamId === 404 ? null : team) } as any,
            { findOne: jest.fn().mockResolvedValue(tournament(status)) } as any,
        );
    };

    it('404s on an unknown team', async () => {
        await expect(build(404).execute(404)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('lists the roster captain-first with the bench marked, and never leaks private user fields', async () => {
        const profile = await build(1).execute(1);
        expect(profile.members.map((m) => [m.id, m.isCaptain, m.isSubstitute])).toEqual([
            [1, true, false], [5, false, false], [6, false, true], [7, false, true],
        ]);
        expect(profile.teamSize).toBe(2);
        expect(profile.maxMembers).toBe(4);
        const json = JSON.stringify(profile);
        for (const leak of ['private@example.org', 'mail', 'passwordHash']) expect(json).not.toContain(leak);
        expect(Object.keys(profile.members[0]).sort()).toEqual(['avatarUrl', 'id', 'isCaptain', 'isDeleted', 'isSubstitute', 'username']);
    });

    it('reports the matches from the team\'s side, skipping byes, with W/L and round', async () => {
        const profile = await build(1).execute(1);
        expect(profile.matches.map((m) => [m.id, m.opponent?.name, m.score, m.result, m.round, m.rounds])).toEqual([
            [1, 'Delta', { for: 2, against: 1 }, 'W', 1, 2],
            [3, 'Charlie', { for: 0, against: 2 }, 'L', 2, 2],
        ]);
        expect(profile.matches[0].stage).toBe('knockout');
    });

    it('flips the score for a team in slot two', async () => {
        const profile = await build(4).execute(4);
        expect(profile.matches).toHaveLength(1);
        expect(profile.matches[0]).toMatchObject({ opponent: { name: 'Alpha' }, score: { for: 1, against: 2 }, result: 'L' });
    });

    it('gives the final placement once the tournament is completed', async () => {
        expect((await build(1).execute(1)).placement).toEqual({ place: 2, outcome: 'finalist' });
        expect((await build(4).execute(4)).placement).toEqual({ place: 3, outcome: 'semifinalist' });
        expect((await build(1, 'ONGOING').execute(1)).placement).toEqual({ place: null, outcome: 'in_progress' });
        expect((await build(1).execute(1)).podium).toEqual({ first: 'Charlie', second: 'Alpha', third: ['Bravo', 'Delta'] });
    });
});
