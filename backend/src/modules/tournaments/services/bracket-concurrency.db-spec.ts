/*
 * Concurrency of the bracket engine against a real Postgres (npm run test:db): two results
 * committed at the same time must leave the same bracket as the two committed one after the
 * other. The in-memory FakeEntityManager cannot show this; it has no row locks.
 */
import { DataSource } from 'typeorm';
import { Match, MatchStatus } from '../../matches/entities/match.entity';
import { MatchFlowService } from '../../matches/services/match-flow.service';
import { Team, TeamStatus } from '../../teams/entities/team.entity';
import { Tournament, TournamentStatus } from '../entities/tournament.entity';
import { TournamentPhase } from '../entities/tournament-phase.entity';
import { StartTournamentCommand } from '../commands/start-tournament.command';
import { WithdrawTeamCommand } from '../commands/withdraw-team.command';
import { BracketEngine } from './bracket-engine.service';
import { BracketGeneratorService } from './bracket-generator.service';
import { migratedDataSource } from '../../../testing/test-db.testing-spec';

let ds: DataSource;
let flow: MatchFlowService;
let start: StartTournamentCommand;
let withdraw: WithdrawTeamCommand;
let seq = 0;

beforeAll(async () => {
    ds = await migratedDataSource('bracket_concurrency');
    await ds.query(`INSERT INTO "games" ("id", "name") VALUES (1, 'Game')`);

    const engine = new BracketEngine(new BracketGeneratorService());
    const notifier = {
        dispatch: () => undefined,
        matchesReady: async () => undefined,
        scoreReported: async () => undefined,
        disputed: async () => undefined,
    };
    const publisher = { matchChanged: async () => undefined, tournamentChanged: async () => undefined };
    const notifications = { sendNotification: async () => undefined };
    const permissions = { isAdmin: async () => true };
    flow = new MatchFlowService(ds, engine, notifier as any, permissions as any, publisher as any);
    start = new StartTournamentCommand(ds, engine, notifications as any, notifier as any, publisher as any);
    withdraw = new WithdrawTeamCommand(ds, engine, notifier as any, publisher as any);
});

afterAll(async () => {
    await ds?.destroy();
});

/** A started tournament with `teamCount` LOCKED teams, seeded by id. */
async function startedTournament(teamCount: number, phases: Partial<TournamentPhase>[]) {
    const tournament = await ds.getRepository(Tournament).save({
        name: `Cup ${++seq}`,
        status: TournamentStatus.REGISTRATION_OPEN,
    });
    for (const [i, def] of phases.entries()) {
        await ds.getRepository(TournamentPhase).save({ tournament_id: tournament.id, order: i + 1, game_id: 1, ...def });
    }
    const teams: Team[] = [];
    for (let i = 1; i <= teamCount; i++) {
        const [{ id: userId }] = await ds.query(
            `INSERT INTO "users" ("username", "mail", "password_hash") VALUES ($1, $2, 'x') RETURNING "id"`,
            [`u${seq}_${i}`, `u${seq}_${i}@example.test`],
        );
        teams.push(
            await ds.getRepository(Team).save({
                name: `T${seq}_${i}`,
                status: TeamStatus.LOCKED,
                captain_id: userId,
                tournament: { id: tournament.id },
            }),
        );
    }
    await start.execute(tournament.id);
    return { tournamentId: tournament.id, teams };
}

const matchesOf = (tournamentId: number) =>
    ds.getRepository(Match).find({ where: { tournament_id: tournamentId }, order: { id: 'ASC' } });

const tournamentOf = (id: number) => ds.getRepository(Tournament).findOneByOrFail({ id });

const KNOCKOUT = [{ type: 'SINGLE_ELIMINATION', teams_limit_end: 1 }];

describe('bracket engine under concurrency (real Postgres)', () => {
    it('two semi-finals confirmed at the same time make the final READY with both teams', async () => {
        for (let run = 0; run < 5; run++) {
            const { tournamentId } = await startedTournament(4, KNOCKOUT);
            const semis = (await matchesOf(tournamentId)).filter((m) => m.round_order === 1);
            expect(semis).toHaveLength(2);

            await Promise.all(semis.map((m) => flow.resolve(m.id, { team1Score: 2, team2Score: 0 })));

            const final = (await matchesOf(tournamentId)).find((m) => m.round_order === 2)!;
            expect(final.team1_id).toBe(semis[0].team1_id);
            expect(final.team2_id).toBe(semis[1].team1_id);
            expect(final.status).toBe(MatchStatus.READY);

            await flow.resolve(final.id, { team1Score: 3, team2Score: 1 });
            expect((await tournamentOf(tournamentId)).status).toBe(TournamentStatus.COMPLETED);
        }
    });

    it('the last two matches of a phase finished at the same time start the next phase', async () => {
        for (let run = 0; run < 5; run++) {
            // Two groups of two (one match each), group winners to a final.
            const { tournamentId } = await startedTournament(4, [
                { type: 'GROUP_STAGE', group_size: 2, group_winners_count: 1 },
                { type: 'SINGLE_ELIMINATION', teams_limit_end: 1 },
            ]);
            const groupMatches = await matchesOf(tournamentId);
            expect(groupMatches).toHaveLength(2);

            await Promise.all(groupMatches.map((m) => flow.resolve(m.id, { team1Score: 1, team2Score: 0 })));

            const tournament = await tournamentOf(tournamentId);
            expect(tournament.current_phase_order).toBe(2);
            const final = (await matchesOf(tournamentId)).filter((m) => m.phase_id === tournament.active_phase_id);
            expect(final).toHaveLength(1);
            expect(final[0].status).toBe(MatchStatus.READY);

            await flow.resolve(final[0].id, { team1Score: 1, team2Score: 0 });
            expect((await tournamentOf(tournamentId)).status).toBe(TournamentStatus.COMPLETED);
        }
    });

    it('a withdrawal and a result at the same time neither deadlock nor lose a team', async () => {
        for (let run = 0; run < 5; run++) {
            const { tournamentId } = await startedTournament(4, KNOCKOUT);
            const [semi1, semi2] = (await matchesOf(tournamentId)).filter((m) => m.round_order === 1);

            await Promise.all([
                flow.resolve(semi1.id, { team1Score: 2, team2Score: 1 }),
                withdraw.execute(tournamentId, semi2.team2_id!),
            ]);

            const final = (await matchesOf(tournamentId)).find((m) => m.round_order === 2)!;
            expect([final.team1_id, final.team2_id]).toEqual([semi1.team1_id, semi2.team1_id]);
            expect(final.status).toBe(MatchStatus.READY);
        }
    });

    it('undo racing the next match report: one of them wins, the bracket stays consistent', async () => {
        const { tournamentId } = await startedTournament(4, KNOCKOUT);
        const [semi1, semi2] = (await matchesOf(tournamentId)).filter((m) => m.round_order === 1);
        await flow.resolve(semi1.id, { team1Score: 2, team2Score: 0 });
        await flow.resolve(semi2.id, { team1Score: 2, team2Score: 0 });
        const final = (await matchesOf(tournamentId)).find((m) => m.round_order === 2)!;

        const results = await Promise.allSettled([
            flow.undo(semi1.id),
            flow.report(final.id, 1, { team1Score: 1, team2Score: 0 }),
        ]);

        const after = await ds.getRepository(Match).findOneByOrFail({ id: final.id });
        const undone = results[0].status === 'fulfilled';
        const reported = results[1].status === 'fulfilled';
        // Either the undo went first (the final lost its slot-1 team and cannot be reported),
        // or the report did (and the undo was refused). Never both.
        expect(undone !== reported).toBe(true);
        if (undone) {
            expect(after.team1_id).toBeNull();
            expect(after.status).toBe(MatchStatus.WAITING);
        } else {
            expect(after.status).toBe(MatchStatus.AWAITING_CONFIRMATION);
        }
    });
});
