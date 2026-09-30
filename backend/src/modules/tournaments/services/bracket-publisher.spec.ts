import { RealtimeEvents } from '../../realtime/realtime.events';
import { BracketPublisher } from './bracket-publisher.service';
import { newEvents } from './bracket-engine.service';
import { WithdrawTeamCommand } from '../commands/withdraw-team.command';
import { SetSeedingCommand } from '../commands/set-seeding.command';
import { TournamentStatus } from '../entities/tournament.entity';
import { MatchStatus } from '../../matches/entities/match.entity';
import { mockRealtime } from '../../teams/testing/test-mocks-spec';

const { MATCH_UPDATED, BRACKET_UPDATED, TOURNAMENT_UPDATED, TEAM_UPDATED } = RealtimeEvents;

const MATCHES: Record<number, any> = {
    10: { id: 10, tournament_id: 3, team1_id: 1, team2_id: 2, status: MatchStatus.AWAITING_CONFIRMATION },
    11: { id: 11, tournament_id: 3, team1_id: 5, team2_id: 6, status: MatchStatus.READY },
    12: { id: 12, tournament_id: 3, team1_id: 7, team2_id: null, status: MatchStatus.WAITING },
};

function setup() {
    const realtime = mockRealtime();
    const matchChat = { ensureRooms: jest.fn(async (_ids: number[]) => undefined) };
    const matchRepo = {
        findOne: jest.fn(async ({ where }: any) => MATCHES[where.id] ?? null),
        find: jest.fn(async ({ where }: any) => (where.id.value as number[]).map((id) => MATCHES[id])),
    };
    const publisher = new BracketPublisher(realtime, matchChat as any, matchRepo as any);
    return { realtime, matchChat, matchRepo, publisher };
}

const calls = (fn: jest.Mock) => fn.mock.calls.map((c) => c.slice(0, 3));
const ids = (fn: jest.Mock) => fn.mock.calls.map((c) => c[0]).sort((a, b) => a - b);
const eventNames = (fn: jest.Mock) => fn.mock.calls.map((c) => c[1]);

describe('BracketPublisher', () => {
    describe('matchChanged', () => {
        it('tells the match room, the bracket and both teams', async () => {
            const { realtime, publisher } = setup();
            await publisher.matchChanged(10, 'score_reported');

            expect(calls(realtime.toMatch)).toEqual([[10, MATCH_UPDATED, { id: 10, reason: 'score_reported' }]]);
            expect(calls(realtime.toTournament)).toEqual([[3, BRACKET_UPDATED, { id: 3, reason: 'score_reported' }]]);
            expect(calls(realtime.toTeam)).toEqual([
                [1, TEAM_UPDATED, { id: 1, reason: 'score_reported' }],
                [2, TEAM_UPDATED, { id: 2, reason: 'score_reported' }],
            ]);
        });

        it('does not send tournament:updated for a plain match change', async () => {
            const { realtime, publisher } = setup();
            await publisher.matchChanged(10, 'match_disputed');
            expect(eventNames(realtime.toTournament)).toEqual([BRACKET_UPDATED]);
        });

        it('sends tournament:updated when the flag is set (undo may reopen the tournament)', async () => {
            const { realtime, publisher } = setup();
            await publisher.matchChanged(10, 'match_undone', undefined, true);
            expect(eventNames(realtime.toTournament)).toEqual([BRACKET_UPDATED, TOURNAMENT_UPDATED]);
        });

        it('announces the completion of the tournament', async () => {
            const { realtime, publisher } = setup();
            const events = { ...newEvents(), completedTournamentId: 3 };
            await publisher.matchChanged(10, 'match_finished', events);
            expect(calls(realtime.toTournament)).toContainEqual([
                3,
                TOURNAMENT_UPDATED,
                { id: 3, reason: 'tournament_completed' },
            ]);
        });

        it('creates the chat of a match that became ready, then tells its teams and room', async () => {
            const { realtime, matchChat, publisher } = setup();
            await publisher.matchChanged(10, 'match_finished', { ...newEvents(), readyMatchIds: [11] });

            expect(matchChat.ensureRooms).toHaveBeenCalledWith([11]);
            expect(ids(realtime.toMatch)).toEqual([10, 11]);
            expect(ids(realtime.toTeam)).toEqual([1, 2, 5, 6]);
        });

        it('has no chat to create when no match became ready', async () => {
            const { matchChat, publisher } = setup();
            await publisher.matchChanged(10, 'score_reported');
            expect(matchChat.ensureRooms).toHaveBeenCalledWith([]);
        });

        it('never throws, even when the database read fails', async () => {
            const { matchRepo, realtime, publisher } = setup();
            matchRepo.findOne.mockRejectedValueOnce(new Error('db down'));
            await expect(publisher.matchChanged(10, 'score_reported')).resolves.toBeUndefined();
            expect(realtime.toMatch).not.toHaveBeenCalled();
        });
    });

    describe('tournamentChanged', () => {
        it('sends bracket:updated and tournament:updated', async () => {
            const { realtime, publisher } = setup();
            await publisher.tournamentChanged(3, 'seeding_changed');
            expect(calls(realtime.toTournament)).toEqual([
                [3, BRACKET_UPDATED, { id: 3, reason: 'seeding_changed' }],
                [3, TOURNAMENT_UPDATED, { id: 3, reason: 'seeding_changed' }],
            ]);
            expect(realtime.toMatch).not.toHaveBeenCalled();
        });

        it('on start, tells the teams of the matches that are ready and creates their chats', async () => {
            const { realtime, matchChat, publisher } = setup();
            await publisher.tournamentChanged(3, 'tournament_started', { ...newEvents(), readyMatchIds: [10, 11] });
            expect(matchChat.ensureRooms).toHaveBeenCalledWith([10, 11]);
            expect(ids(realtime.toTeam)).toEqual([1, 2, 5, 6]);
        });
    });
});

describe('command publish points', () => {
    it('withdraw: publishes after the transaction, with the matches and the team', async () => {
        const order: string[] = [];
        const dataSource = {
            transaction: async (fn: any) => {
                const r = await fn({ findOne: async () => ({ id: 3 }) });
                order.push('commit');
                return r;
            },
        };
        const engine = { withdrawTeam: jest.fn(async () => [{ id: 10 }, { id: 12 }]) };
        const notifier = { dispatch: jest.fn(), matchesReady: jest.fn() };
        const publisher = { tournamentChanged: jest.fn(() => order.push('publish')) };
        const cmd = new WithdrawTeamCommand(dataSource as any, engine as any, notifier as any, publisher as any);

        await cmd.execute(3, 7);

        expect(order).toEqual(['commit', 'publish']);
        expect(publisher.tournamentChanged).toHaveBeenCalledWith(3, 'team_withdrawn', expect.anything(), {
            matchIds: [10, 12],
            teamIds: [7],
        });
    });

    it('set seeding: publishes seeding_changed, and nothing when refused', async () => {
        const repo = {
            findOne: jest.fn(async () => ({
                id: 3,
                status: TournamentStatus.REGISTRATION_OPEN,
                teams: [{ id: 1 }, { id: 2 }],
            })),
            update: jest.fn(),
        };
        const publisher = { tournamentChanged: jest.fn() };
        const cmd = new SetSeedingCommand(repo as any, { execute: jest.fn() } as any, publisher as any);

        await expect(cmd.execute(3, [1, 99])).rejects.toThrow();
        expect(publisher.tournamentChanged).not.toHaveBeenCalled();

        await cmd.execute(3, [2, 1]);
        expect(publisher.tournamentChanged).toHaveBeenCalledWith(3, 'seeding_changed');
    });
});
