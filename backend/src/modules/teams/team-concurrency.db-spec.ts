/*
 * Roster and capacity limits under concurrency, against real Postgres (npm run test:db).
 */
import { DataSource } from 'typeorm';
import { migratedDataSource } from '../../testing/test-db.testing-spec';
import { Team, TeamStatus } from './entities/team.entity';
import { Tournament, TournamentStatus } from '../tournaments/entities/tournament.entity';
import { TournamentPhase } from '../tournaments/entities/tournament-phase.entity';
import { JoinByCodeCommand } from './commands/join-by-code.command';
import { LockTeamCommand } from './commands/lock-team.command';
import { TeamMembershipService } from './services/team-membership.service';

let ds: DataSource;
let seq = 0;
const realtime = { toTeam: () => undefined, toTournament: () => undefined, toUser: () => undefined, leaveTeamRoom: () => undefined };

beforeAll(async () => {
    ds = await migratedDataSource('team_concurrency');
    // Solo game: one starter, two substitutes, so a roster holds at most 3.
    await ds.query(`INSERT INTO "games" ("id", "name", "team_size") VALUES (1, 'Solo', 1)`);
});

afterAll(async () => {
    await ds?.destroy();
});

async function user(): Promise<number> {
    const n = `p${++seq}`;
    const [{ id }] = await ds.query(
        `INSERT INTO "users" ("username", "mail", "password_hash") VALUES ($1, $2, 'x') RETURNING "id"`,
        [n, `${n}@example.test`],
    );
    return id;
}

async function tournament(max: number | null = null) {
    const t = await ds.getRepository(Tournament).save({
        name: `Cup ${++seq}`,
        status: TournamentStatus.REGISTRATION_OPEN,
        max_participants: max as number,
    });
    await ds.getRepository(TournamentPhase).save({ tournament_id: t.id, order: 1, game_id: 1, type: 'SINGLE_ELIMINATION' });
    return t;
}

async function team(tournamentId: number, memberIds: number[], code: string) {
    const t = await ds.getRepository(Team).save({
        name: `T${++seq}`,
        status: TeamStatus.DRAFT,
        captain_id: memberIds[0],
        tournament: { id: tournamentId },
        join_code: code,
    });
    for (const id of memberIds) await ds.query(`INSERT INTO "team_members" ("team_id", "user_id") VALUES ($1, $2)`, [t.id, id]);
    return t;
}

describe('team limits under concurrency (real Postgres)', () => {
    it('two people joining by code for the last roster spot: exactly one gets it', async () => {
        for (let run = 0; run < 5; run++) {
            const t = await tournament();
            const code = `code${++seq}`.padEnd(10, 'x');
            const tm = await team(t.id, [await user(), await user()], code);
            const join = new JoinByCodeCommand(ds, new TeamMembershipService(), realtime as any);

            const results = await Promise.allSettled([join.execute(code, await user()), join.execute(code, await user())]);

            expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
            const [{ n }] = await ds.query(`SELECT count(*)::int AS n FROM "team_members" WHERE "team_id" = $1`, [tm.id]);
            expect(n).toBe(3);
        }
    });

    it('two teams locking for the last tournament spot: exactly one is LOCKED', async () => {
        for (let run = 0; run < 5; run++) {
            const t = await tournament(1);
            const a = await team(t.id, [await user()], `a${++seq}`.padEnd(10, 'x'));
            const b = await team(t.id, [await user()], `b${++seq}`.padEnd(10, 'x'));
            const lock = new LockTeamCommand(ds.getRepository(Team), { assertAdmin: async () => undefined } as any, realtime as any);

            const results = await Promise.allSettled([lock.execute(a.id, a.captain_id), lock.execute(b.id, b.captain_id)]);

            expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
            const [{ n }] = await ds.query(
                `SELECT count(*)::int AS n FROM "teams" WHERE "tournamentId" = $1 AND "status" = 'LOCKED'`,
                [t.id],
            );
            expect(n).toBe(1);
        }
    });
});
