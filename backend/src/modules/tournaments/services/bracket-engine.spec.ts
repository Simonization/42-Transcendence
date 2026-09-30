import { BadRequestException, ConflictException } from '@nestjs/common';
import { Match, MatchStatus } from '../../matches/entities/match.entity';
import { Team } from '../../teams/entities/team.entity';
import { Tournament } from '../entities/tournament.entity';
import { StartTournamentCommand } from '../commands/start-tournament.command';
import { BracketEngine, newEvents } from './bracket-engine.service';
import { BracketGeneratorService } from './bracket-generator.service';
import { FakeEntityManager, seedTournament } from './fake-entity-manager.testing-spec';

function setup() {
    const manager = new FakeEntityManager();
    const engine = new BracketEngine(new BracketGeneratorService());
    const dataSource = {
        transaction: (fn: (m: any) => any) => fn(manager),
        getRepository: () => ({ find: async () => [] }),
    };
    const notifier = { dispatch: jest.fn(), matchesReady: jest.fn(async () => undefined) };
    const notifications = { sendNotification: jest.fn() };
    const start = new StartTournamentCommand(dataSource as any, engine, notifications as any, notifier as any);
    return { manager, engine, start, notifier };
}

async function started(teamCount: number, opts: Parameters<typeof seedTournament>[1] = { teamCount }) {
    const ctx = setup();
    const seeded = await seedTournament(ctx.manager, { ...opts, teamCount });
    await ctx.start.execute(seeded.tournament.id);
    return { ...ctx, ...seeded };
}

const byRound = (matches: Match[], round: number) =>
    matches.filter((m) => m.round_order === round).sort((a, b) => a.id - b.id);

/** Finishes a match through the engine, team1 winning unless `winner` says otherwise. */
async function play(manager: FakeEntityManager, engine: BracketEngine, id: number, winner?: number) {
    const m = manager.get(Match, id);
    const w = winner ?? m.team1_id!;
    const events = newEvents();
    await engine.finishMatch(manager as any, m, w, { team1: w === m.team1_id ? 2 : 0, team2: w === m.team2_id ? 2 : 0 }, events);
    return events;
}

describe('BracketEngine', () => {
    describe('start: seeding and byes', () => {
        for (let n = 2; n <= 9; n++) {
            it(`builds a sound bracket for ${n} teams`, async () => {
                const { manager } = await started(n);
                const matches = manager.all(Match);
                const round1 = byRound(matches, 1);

                // No first-round match without a team; every team in round 1 exactly once.
                for (const m of round1) expect(m.team1_id ?? m.team2_id).not.toBeNull();
                const ids = round1.flatMap((m) => [m.team1_id, m.team2_id]).filter((x) => x != null);
                expect([...ids].sort((a, b) => a! - b!)).toEqual(Array.from({ length: n }, (_, i) => i + 1));

                // Byes are BYE matches won by the lone team, which is one of the top seeds.
                const byes = round1.filter((m) => m.status === MatchStatus.BYE);
                let size = 2;
                while (size < n) size *= 2;
                expect(byes).toHaveLength(size - n);
                for (const bye of byes) {
                    expect(bye.team2_id).toBeNull();
                    expect(bye.winner_id).toBe(bye.team1_id);
                    expect(bye.team1_id!).toBeLessThanOrEqual(size - n);
                }

                // Byes already advanced: each lands in the slot its match feeds.
                for (const bye of byes) {
                    const next = manager.get(Match, bye.winner_next_match_id);
                    const slot = bye.winner_next_match_slot === 2 ? next.team2_id : next.team1_id;
                    expect(slot).toBe(bye.winner_id);
                }

                // Real first-round pairs are READY; nothing else is READY unless both slots are set.
                for (const m of matches) {
                    if (m.status === MatchStatus.READY) {
                        expect(m.team1_id).not.toBeNull();
                        expect(m.team2_id).not.toBeNull();
                    }
                }
                expect(matches.filter((m) => !m.winner_next_match_id)).toHaveLength(1);
            });
        }

        it('seeds 1 v N and sends the byes to seeds 1-3 for 5 teams', async () => {
            const { manager } = await started(5);
            const round1 = byRound(manager.all(Match), 1).map((m) => [m.team1_id, m.team2_id]);
            expect(round1).toEqual([
                [1, null],
                [4, 5],
                [2, null],
                [3, null],
            ]);
            // Seeds 2 and 3 met each other's byes into the same semi-final: READY at start.
            const semis = byRound(manager.all(Match), 2);
            expect(semis[1]).toMatchObject({ team1_id: 2, team2_id: 3, status: MatchStatus.READY });
        });

        it('follows the admin seed order and freezes it', async () => {
            const ctx = setup();
            const { tournament } = await seedTournament(ctx.manager, { teamCount: 4 });
            await ctx.manager.update(Tournament, tournament.id, { seed_order: [4, 3, 2, 1] });
            await ctx.start.execute(tournament.id);

            const first = byRound(ctx.manager.all(Match), 1).map((m) => [m.team1_id, m.team2_id]);
            expect(first).toEqual([
                [4, 1],
                [3, 2],
            ]);
            expect(ctx.manager.get(Tournament, tournament.id).seed_order).toEqual([4, 3, 2, 1]);
        });

        it('archives DRAFT teams and keeps them out of the bracket', async () => {
            const { manager } = await started(4, { teamCount: 4, statuses: { 2: 'DRAFT' } });
            expect(manager.get(Team, 2).status).toBe('ARCHIVED');
            const inBracket = manager.all(Match).flatMap((m) => [m.team1_id, m.team2_id]);
            expect(inBracket).not.toContain(2);
        });

        it('refuses fewer than 2 locked teams', async () => {
            const ctx = setup();
            const { tournament } = await seedTournament(ctx.manager, { teamCount: 2, statuses: { 2: 'DRAFT' } });
            await expect(ctx.start.execute(tournament.id)).rejects.toBeInstanceOf(BadRequestException);
        });

        it('refuses more locked teams than max_participants', async () => {
            const ctx = setup();
            const { tournament } = await seedTournament(ctx.manager, { teamCount: 5, max: 4 });
            await expect(ctx.start.execute(tournament.id)).rejects.toThrow(/exceed the maximum/);
            expect(ctx.manager.all(Match)).toHaveLength(0);
        });
    });

    describe('winner propagation', () => {
        for (const order of [
            [0, 1],
            [1, 0],
        ]) {
            it(`fills the right slot when feeders finish in order ${order.join(',')}`, async () => {
                const { manager, engine } = await started(4);
                const semis = byRound(manager.all(Match), 1);
                const winners = semis.map((m) => m.team2_id!); // team2 wins both semis

                for (const i of order) await play(manager, engine, semis[i].id, winners[i]);

                const final = manager.get(Match, semis[0].winner_next_match_id);
                const expected: Record<number, number> = {};
                semis.forEach((m, i) => (expected[m.winner_next_match_slot] = winners[i]));
                expect(final.team1_id).toBe(expected[1]);
                expect(final.team2_id).toBe(expected[2]);
                expect(final.status).toBe(MatchStatus.READY);
            });
        }

        it('reports the match that became READY', async () => {
            const { manager, engine } = await started(4);
            const semis = byRound(manager.all(Match), 1);
            expect((await play(manager, engine, semis[0].id)).readyMatchIds).toEqual([]);
            const events = await play(manager, engine, semis[1].id);
            expect(events.readyMatchIds).toEqual([semis[0].winner_next_match_id]);
        });

        it('refuses a winner who is not in the match', async () => {
            const { manager, engine } = await started(4);
            const m = byRound(manager.all(Match), 1)[0];
            const outsider = [1, 2, 3, 4].find((id) => id !== m.team1_id && id !== m.team2_id)!;
            await expect(
                engine.finishMatch(manager as any, m, outsider, { team1: 1, team2: 0 }, newEvents()),
            ).rejects.toBeInstanceOf(BadRequestException);
        });

        it('completes the tournament after the final and archives every team', async () => {
            const { manager, engine, tournament } = await started(3);
            const matches = manager.all(Match);
            const semi = byRound(matches, 1).find((m) => m.status === MatchStatus.READY)!;
            await play(manager, engine, semi.id);
            const final = byRound(manager.all(Match), 2)[0];
            const events = await play(manager, engine, final.id);

            const t = manager.get(Tournament, tournament.id);
            expect(t.status).toBe('COMPLETED');
            expect(Number.isNaN(new Date(t.finished_at as any).getTime())).toBe(false);
            expect(events.completedTournamentId).toBe(tournament.id);
            expect(manager.all(Team).every((team) => team.status === 'ARCHIVED')).toBe(true);
        });
    });

    describe('undo', () => {
        it('reverts a result and clears the slot it filled', async () => {
            const { manager, engine } = await started(4);
            const [semi1, semi2] = byRound(manager.all(Match), 1);
            await play(manager, engine, semi1.id);
            await play(manager, engine, semi2.id);

            await engine.undoMatch(manager as any, manager.get(Match, semi2.id));

            const reverted = manager.get(Match, semi2.id);
            expect(reverted).toMatchObject({ status: MatchStatus.READY, winner_id: null, team1_score: null });
            const final = manager.get(Match, semi2.winner_next_match_id);
            expect(semi2.winner_next_match_slot === 2 ? final.team2_id : final.team1_id).toBeNull();
            expect(final.status).toBe(MatchStatus.WAITING);
        });

        it('refuses once the next match has been reported', async () => {
            const { manager, engine } = await started(4);
            const [semi1, semi2] = byRound(manager.all(Match), 1);
            await play(manager, engine, semi1.id);
            await play(manager, engine, semi2.id);
            await manager.update(Match, semi1.winner_next_match_id, {
                status: MatchStatus.AWAITING_CONFIRMATION,
                reported_by_team_id: 1,
            });
            await expect(engine.undoMatch(manager as any, manager.get(Match, semi1.id))).rejects.toBeInstanceOf(
                ConflictException,
            );
        });

        it('reopens a completed tournament when the final is undone', async () => {
            const { manager, engine, tournament } = await started(2);
            const final = manager.all(Match)[0];
            await play(manager, engine, final.id);
            expect(manager.get(Tournament, tournament.id).status).toBe('COMPLETED');

            await engine.undoMatch(manager as any, manager.get(Match, final.id));
            const t = manager.get(Tournament, tournament.id);
            expect(t.status).toBe('ONGOING');
            expect(t.finished_at).toBeNull();
            expect(manager.all(Team).map((team) => team.status)).toEqual(['LOCKED', 'LOCKED']);
        });

        it('refuses a match that is not finished', async () => {
            const { manager, engine } = await started(4);
            const m = byRound(manager.all(Match), 1)[0];
            await expect(engine.undoMatch(manager as any, m)).rejects.toBeInstanceOf(BadRequestException);
        });
    });

    describe('withdraw', () => {
        it('awards a READY match to the opponent as a walkover', async () => {
            const { manager, engine, tournament } = await started(4);
            const m = byRound(manager.all(Match), 1)[0];
            const quitter = m.team1_id!;
            await engine.withdrawTeam(manager as any, manager.get(Tournament, tournament.id), quitter, newEvents());

            const after = manager.get(Match, m.id);
            expect(after).toMatchObject({
                status: MatchStatus.FINISHED,
                winner_id: m.team2_id,
                team1_score: null,
                team2_score: null,
            });
            expect(after.game_data).toMatchObject({ walkover: true, withdrawn_team_id: quitter });
            expect(manager.get(Team, quitter).status).toBe('ARCHIVED');
            const next = manager.get(Match, m.winner_next_match_id);
            expect([next.team1_id, next.team2_id]).toContain(m.team2_id);
        });

        it('turns a match still waiting for its opponent into a walkover when the opponent arrives', async () => {
            const { manager, engine, tournament } = await started(4);
            const [semi1, semi2] = byRound(manager.all(Match), 1);
            await play(manager, engine, semi1.id);
            const finalist = manager.get(Match, semi1.id).winner_id!;

            await engine.withdrawTeam(manager as any, manager.get(Tournament, tournament.id), finalist, newEvents());
            expect(manager.get(Match, semi1.winner_next_match_id).status).toBe(MatchStatus.WAITING);

            await play(manager, engine, semi2.id);
            const final = manager.get(Match, semi1.winner_next_match_id);
            expect(final.status).toBe(MatchStatus.FINISHED);
            expect(final.winner_id).toBe(manager.get(Match, semi2.id).winner_id);
            expect(manager.get(Tournament, tournament.id).status).toBe('COMPLETED');
        });

        it('refuses a team with nothing left to play', async () => {
            const { manager, engine, tournament } = await started(4);
            const m = byRound(manager.all(Match), 1)[0];
            await play(manager, engine, m.id);
            const loser = m.team2_id!;
            await expect(
                engine.withdrawTeam(manager as any, manager.get(Tournament, tournament.id), loser, newEvents()),
            ).rejects.toBeInstanceOf(BadRequestException);
        });
    });

    describe('group stage', () => {
        const phases = [
            { type: 'GROUP_STAGE', group_size: 4, group_winners_count: 2, teams_limit_start: 8, teams_limit_end: 4 },
            { type: 'SINGLE_ELIMINATION', teams_limit_start: 4, teams_limit_end: 1 },
        ];

        it('keeps groups and matchdays apart, then seeds the knockout from the standings', async () => {
            const { manager, engine, tournament } = await started(8, { teamCount: 8, phases });
            const group = manager.all(Match);
            expect(group).toHaveLength(12); // 2 groups x 6 matches
            expect(new Set(group.map((m) => m.group_index))).toEqual(new Set([0, 1]));
            expect(new Set(group.map((m) => m.round_order))).toEqual(new Set([1, 2, 3]));
            expect(group.every((m) => m.status === MatchStatus.READY)).toBe(true);

            // Lower id wins every group match: group A = 1,4,5,8 -> 1 then 4; B = 2,3,6,7 -> 2 then 3.
            for (const m of group) {
                await play(manager, engine, m.id, Math.min(m.team1_id!, m.team2_id!));
            }

            const t = manager.get(Tournament, tournament.id);
            expect(t.current_phase_order).toBe(2);
            const knockout = manager.all(Match).filter((m) => m.phase_id === t.active_phase_id);
            const first = byRound(knockout, 1).map((m) => [m.team1_id, m.team2_id]);
            // Seeds: A1=1, B1=2, A2=4, B2=3 -> 1 v B2, B1 v A2.
            expect(first).toEqual([
                [1, 3],
                [2, 4],
            ]);
        });
    });
});
