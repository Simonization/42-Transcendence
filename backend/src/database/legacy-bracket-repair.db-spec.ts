/*
 * LegacyBracketRepair against real Postgres (npm run test:db): brackets started by the old
 * engine (production at bb033ea, the Baseline schema) must become playable to the end, and the
 * migration must change nothing on brackets the current engine built.
 */
import { DataSource } from 'typeorm';
import { Baseline1790793062515 } from './migrations/1790793062515-Baseline';
import { LegacyBracketRepair1790800000000 } from './migrations/1790800000000-LegacyBracketRepair';
import { createDatabase, openDataSource } from '../testing/test-db.testing-spec';
import { Match, MatchStatus } from '../modules/matches/entities/match.entity';
import { MatchFlowService } from '../modules/matches/services/match-flow.service';
import { Team, TeamStatus } from '../modules/teams/entities/team.entity';
import { Tournament, TournamentStatus } from '../modules/tournaments/entities/tournament.entity';
import { TournamentPhase } from '../modules/tournaments/entities/tournament-phase.entity';
import { StartTournamentCommand } from '../modules/tournaments/commands/start-tournament.command';
import { BracketEngine } from '../modules/tournaments/services/bracket-engine.service';
import { BracketGeneratorService } from '../modules/tournaments/services/bracket-generator.service';

/**
 * A tournament the bb033ea engine started with `n` teams (ids base+1..base+n): its generator
 * built the tree final-first, depth-first, and popped teams off the end of the list two at a
 * time into the leaves, so the last leaves are short. Rows in the Baseline shape (match_teams).
 */
function legacyTournament(tournamentId: number, n: number): string {
    const base = tournamentId * 100;
    const phaseId = tournamentId;
    const sql: string[] = [];
    sql.push(`INSERT INTO "tournaments" ("id", "name", "status", "active_phase_id", "current_phase_order")
              VALUES (${tournamentId}, 'Legacy ${n}', 'ONGOING', NULL, 1);`);
    sql.push(`INSERT INTO "tournament_phases" ("id", "tournament_id", "order", "type", "game_id")
              VALUES (${phaseId}, ${tournamentId}, 1, 'SINGLE_ELIMINATION', 1);`);
    sql.push(`UPDATE "tournaments" SET "active_phase_id" = ${phaseId} WHERE "id" = ${tournamentId};`);
    for (let i = 1; i <= n; i++) {
        const id = base + i;
        sql.push(`INSERT INTO "users" ("id", "username", "mail", "password_hash")
                  VALUES (${id}, 'u${id}', 'u${id}@example.test', 'x');`);
        sql.push(`INSERT INTO "teams" ("id", "name", "status", "captain_id", "tournamentId")
                  VALUES (${id}, 'T${id}', 'LOCKED', ${id}, ${tournamentId});`);
        sql.push(`INSERT INTO "team_members" ("team_id", "user_id") VALUES (${id}, ${id});`);
    }

    const pool = Array.from({ length: n }, (_, i) => base + i + 1);
    let size = 2;
    while (size < n) size *= 2;
    let nextId = base;
    const branch = (round: number, parent: number | null, slot: number | null) => {
        const id = ++nextId;
        sql.push(`INSERT INTO "matches" ("id", "phase_id", "round_order", "status", "winner_next_match_id", "winner_next_match_slot")
                  VALUES (${id}, ${phaseId}, ${round}, 'WAITING', ${parent ?? 'NULL'}, ${slot ?? 'NULL'});`);
        if (round === 1) {
            for (const team of [pool.pop(), pool.pop()]) {
                if (team) sql.push(`INSERT INTO "match_teams" ("match_id", "team_id") VALUES (${id}, ${team});`);
            }
            return;
        }
        branch(round - 1, id, 1);
        branch(round - 1, id, 2);
    };
    branch(Math.log2(size), null, null);
    return sql.join('\n');
}

let database: string;
let ds: DataSource;
let flow: MatchFlowService;
let start: StartTournamentCommand;

beforeAll(async () => {
    database = await createDatabase('legacy_repair');
    const baseline = await openDataSource(database, [Baseline1790793062515]);
    await baseline.runMigrations({ transaction: 'all' });
    await baseline.query(`INSERT INTO "games" ("id", "name") VALUES (1, 'Game')`);
    await baseline.query(legacyTournament(1, 5));
    await baseline.query(legacyTournament(2, 6));
    await baseline.query(legacyTournament(3, 4));
    await baseline.query(`SELECT setval('users_id_seq', 1000), setval('teams_id_seq', 1000),
                                 setval('matches_id_seq', 1000), setval('tournaments_id_seq', 1000),
                                 setval('tournament_phases_id_seq', 1000)`);
    await baseline.destroy();

    ds = await openDataSource(database);
    await ds.runMigrations({ transaction: 'all' });

    const engine = new BracketEngine(new BracketGeneratorService());
    const notifier = { dispatch: () => undefined, matchesReady: async () => undefined };
    const publisher = { matchChanged: async () => undefined, tournamentChanged: async () => undefined };
    flow = new MatchFlowService(ds, engine, notifier as any, { isAdmin: async () => true } as any, publisher as any);
    start = new StartTournamentCommand(ds, engine, { sendNotification: async () => undefined } as any, notifier as any, publisher as any);
});

afterAll(async () => {
    await ds?.destroy();
});

const match = (id: number) => ds.getRepository(Match).findOneByOrFail({ id });
const tournament = (id: number) => ds.getRepository(Tournament).findOneByOrFail({ id });

/** Plays every READY match (team1 wins) until none is left. */
async function playOut(tournamentId: number) {
    for (let guard = 0; guard < 20; guard++) {
        const ready = await ds.getRepository(Match).find({
            where: { tournament_id: tournamentId, status: MatchStatus.READY },
            order: { id: 'ASC' },
        });
        if (!ready.length) return;
        await flow.resolve(ready[0].id, { team1Score: 2, team2Score: 1 });
    }
    throw new Error('bracket did not finish');
}

describe('LegacyBracketRepair (real Postgres)', () => {
    it('turns a stalled bb033ea 5-team bracket into a playable one', async () => {
        // Tree: final 101; semis 102 (slot 1), 105 (slot 2); leaves 103 [105,104], 104 [103,102],
        // 106 [101] alone, 107 empty.
        expect(await match(106)).toMatchObject({ status: MatchStatus.BYE, team1_id: 101, winner_id: 101 });
        expect((await match(106)).finished_at).not.toBeNull();
        expect(await match(107)).toMatchObject({ status: MatchStatus.CANCELLED, team1_id: null, team2_id: null });
        // The bye's winner moved up twice: semi 105 had nothing else coming, so it is a bye too,
        // and team 101 waits in the final's slot 2, the slot semi 105 feeds.
        expect(await match(105)).toMatchObject({ status: MatchStatus.BYE, winner_id: 101 });
        expect(await match(101)).toMatchObject({ status: MatchStatus.WAITING, team1_id: null, team2_id: 101 });
        expect(await match(102)).toMatchObject({ status: MatchStatus.WAITING });
        for (const id of [103, 104]) expect((await match(id)).status).toBe(MatchStatus.READY);

        expect((await tournament(1)).seed_order).toEqual([101, 102, 103, 104, 105]);

        await playOut(1);
        const done = await tournament(1);
        expect(done.status).toBe(TournamentStatus.COMPLETED);
        expect((await match(101)).winner_id).not.toBeNull();
    });

    it('a 6-team bracket: the semi whose other leaf was empty becomes a bye once its team arrives', async () => {
        // Leaves 203 [206,205], 204 [204,203], 206 [202,201], 207 empty; semi 205 = 206 + 207.
        expect((await match(207)).status).toBe(MatchStatus.CANCELLED);
        expect(await match(205)).toMatchObject({ status: MatchStatus.WAITING, team1_id: null, team2_id: null });

        await flow.resolve(206, { team1Score: 2, team2Score: 0 });
        const semi = await match(205);
        expect(semi).toMatchObject({ status: MatchStatus.BYE, winner_id: semi.team1_id });
        expect((await match(201)).team2_id).toBe(semi.team1_id);

        await playOut(2);
        expect((await tournament(2)).status).toBe(TournamentStatus.COMPLETED);
    });

    it('leaves a full legacy bracket as the previous migration left it, apart from the seed order', async () => {
        // Final 301, semis 302 [304,303] and 303 [302,301].
        for (const id of [302, 303]) expect((await match(id)).status).toBe(MatchStatus.READY);
        expect(await match(301)).toMatchObject({ status: MatchStatus.WAITING, team1_id: null, team2_id: null });
        expect((await tournament(3)).seed_order).toEqual([301, 302, 303, 304]);
    });

    it('changes nothing on brackets the current engine built', async () => {
        const t = await ds.getRepository(Tournament).save({ name: 'Modern', status: TournamentStatus.REGISTRATION_OPEN });
        await ds.getRepository(TournamentPhase).save({ tournament_id: t.id, order: 1, game_id: 1, type: 'SINGLE_ELIMINATION', teams_limit_end: 1 });
        for (let i = 0; i < 5; i++) {
            const [{ id }] = await ds.query(
                `INSERT INTO "users" ("username", "mail", "password_hash") VALUES ($1, $2, 'x') RETURNING "id"`,
                [`m${i}`, `m${i}@example.test`],
            );
            await ds.getRepository(Team).save({ name: `M${i}`, status: TeamStatus.LOCKED, captain_id: id, tournament: { id: t.id } });
        }
        await start.execute(t.id);
        const first = (await ds.getRepository(Match).find({ where: { tournament_id: t.id, round_order: 1 } }))[0];
        if (first.status === MatchStatus.READY) await flow.resolve(first.id, { team1Score: 1, team2Score: 0 });

        const snapshot = async () =>
            JSON.stringify([
                await ds.query(`SELECT * FROM "matches" ORDER BY "id"`),
                await ds.query(`SELECT * FROM "tournaments" ORDER BY "id"`),
            ]);
        const before = await snapshot();
        const runner = ds.createQueryRunner();
        try {
            await new LegacyBracketRepair1790800000000().up(runner);
        } finally {
            await runner.release();
        }
        expect(await snapshot()).toBe(before);
    });
});
