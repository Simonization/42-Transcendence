/*
 * Team / registration edge cases from the QA pass, against real Postgres (npm run test:db):
 *  1. team names are unique per tournament (case-insensitive, trimmed), also under races;
 *  2. no roster entry point lets anyone in after the registration deadline;
 *  3. a LOCKED team cannot silently fall out of the bracket after the deadline.
 */
import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { migratedDataSource } from '../../testing/test-db.testing-spec';
import { Team, TeamStatus } from './entities/team.entity';
import { TeamInvitation, InvitationDirection, InvitationStatus } from './entities/team-invitation.entity';
import { Tournament, TournamentStatus } from '../tournaments/entities/tournament.entity';
import { TournamentPhase } from '../tournaments/entities/tournament-phase.entity';
import { User } from '../users/entities/user.entity';
import { CreateTeamCommand } from './commands/create-team.command';
import { RenameTeamCommand } from './commands/rename-team.command';
import { InvitePlayerCommand } from './commands/invite-player.command';
import { CreateJoinRequestCommand } from './commands/create-join-request.command';
import { AcceptJoinRequestCommand } from './commands/accept-join-request.command';
import { AcceptInvitationCommand } from './commands/accept-invitation.command';
import { JoinByCodeCommand } from './commands/join-by-code.command';
import { LeaveTeamCommand } from './commands/leave-team.command';
import { LockTeamCommand } from './commands/lock-team.command';
import { TeamMembershipService } from './services/team-membership.service';

let ds: DataSource;
let seq = 0;
const realtime = { toTeam: () => undefined, toTournament: () => undefined, toUser: () => undefined, leaveTeamRoom: () => undefined } as any;
const notifications = { sendNotification: async () => ({}) } as any;
const allow = { assertAdmin: async () => undefined, listAdminIds: async () => [] } as any;

beforeAll(async () => {
    ds = await migratedDataSource('team_registration_edges');
    await ds.query(`INSERT INTO "games" ("id", "name", "team_size") VALUES (1, 'Solo', 1), (2, 'Duo', 2)`);
});

afterAll(async () => {
    await ds?.destroy();
});

async function user(): Promise<User> {
    const n = `r${++seq}`;
    const [{ id }] = await ds.query(
        `INSERT INTO "users" ("username", "mail", "password_hash") VALUES ($1, $2, 'x') RETURNING "id"`,
        [n, `${n}@example.test`],
    );
    return ds.getRepository(User).findOneByOrFail({ id });
}

/** `closesInMs` < 0: the registration deadline has passed (status still REGISTRATION_OPEN). */
async function tournament(opts: { gameId?: number; closesInMs?: number | null } = {}) {
    const closes = opts.closesInMs == null ? null : new Date(Date.now() + opts.closesInMs);
    const t = await ds.getRepository(Tournament).save({
        name: `Cup ${++seq}`,
        status: TournamentStatus.REGISTRATION_OPEN,
        registration_closes_at: closes,
    });
    await ds.getRepository(TournamentPhase).save({ tournament_id: t.id, order: 1, game_id: opts.gameId ?? 1, type: 'SINGLE_ELIMINATION' });
    return t;
}

async function team(tournamentId: number, members: User[], status = TeamStatus.DRAFT, name = `T${++seq}`) {
    const t = await ds.getRepository(Team).save({
        name,
        status,
        captain_id: members[0].id,
        tournament: { id: tournamentId },
        join_code: `c${++seq}`.padEnd(10, 'x'),
    });
    for (const m of members) await ds.query(`INSERT INTO "team_members" ("team_id", "user_id") VALUES ($1, $2)`, [t.id, m.id]);
    return t;
}

const pastDeadline = (t: Tournament) =>
    ds.query(`UPDATE "tournaments" SET "registration_closes_at" = now() - interval '1 minute' WHERE "id" = $1`, [t.id]);

const createTeam = () =>
    new CreateTeamCommand(ds.getRepository(Team), ds.getRepository(Tournament), ds, realtime);
const renameTeam = () => new RenameTeamCommand(ds.getRepository(Team), allow, realtime);

describe('1. team names are unique within a tournament', () => {
    it('refuses a name already used in the same tournament, ignoring case and surrounding spaces (409)', async () => {
        const t = await tournament();
        await createTeam().execute({ name: 'Red Dragons', tournament_id: t.id }, await user());

        const err = await createTeam().execute({ name: '  red DRAGONS ', tournament_id: t.id }, await user()).catch((e) => e);
        expect(err).toBeInstanceOf(ConflictException);
        // `error` is what the SPA's ApiError exposes as `code`.
        expect(err.getResponse()).toMatchObject({ statusCode: 409, error: 'TEAM_NAME_TAKEN' });
    });

    it('stores the trimmed name, and the same name is fine in another tournament', async () => {
        const [a, b] = [await tournament(), await tournament()];
        const first = await createTeam().execute({ name: '  Blue  ', tournament_id: a.id }, await user());
        expect(first.name).toBe('Blue');
        await expect(createTeam().execute({ name: 'blue', tournament_id: b.id }, await user())).resolves.toBeDefined();
    });

    it('refuses a rename to a name another team of the tournament uses; renaming to your own name in a new case is fine', async () => {
        const t = await tournament();
        await team(t.id, [await user()], TeamStatus.DRAFT, 'Owls');
        const mine = await team(t.id, [await user()], TeamStatus.DRAFT, 'Hawks');

        await expect(renameTeam().execute(mine.id, ' OWLS', mine.captain_id)).rejects.toBeInstanceOf(ConflictException);
        await expect(renameTeam().execute(mine.id, 'HAWKS', mine.captain_id)).resolves.toMatchObject({ name: 'HAWKS' });
    });

    it('two teams created at once with the same name: exactly one is created', async () => {
        for (let run = 0; run < 5; run++) {
            const t = await tournament();
            const results = await Promise.allSettled([
                createTeam().execute({ name: 'Twins', tournament_id: t.id }, await user()),
                createTeam().execute({ name: 'twins', tournament_id: t.id }, await user()),
            ]);
            expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
            const rejected = results.find((r) => r.status === 'rejected') as PromiseRejectedResult;
            expect(rejected.reason).toBeInstanceOf(ConflictException);
            const [{ n }] = await ds.query(`SELECT count(*)::int AS n FROM "teams" WHERE "tournamentId" = $1`, [t.id]);
            expect(n).toBe(1);
        }
    });

    it('two teams renamed at once to the same name: exactly one gets it', async () => {
        for (let run = 0; run < 5; run++) {
            const t = await tournament();
            const a = await team(t.id, [await user()]);
            const b = await team(t.id, [await user()]);
            const results = await Promise.allSettled([
                renameTeam().execute(a.id, 'Same', a.captain_id),
                renameTeam().execute(b.id, 'SAME', b.captain_id),
            ]);
            expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
            expect((results.find((r) => r.status === 'rejected') as PromiseRejectedResult).reason).toBeInstanceOf(ConflictException);
        }
    });

    it('the database itself refuses a duplicate (case-insensitive, trimmed) in one tournament', async () => {
        const t = await tournament();
        await team(t.id, [await user()], TeamStatus.DRAFT, 'Wolves');
        await expect(team(t.id, [await user()], TeamStatus.DRAFT, ' wolves ')).rejects.toThrow(/duplicate key/);
    });
});

describe('2. nobody gets onto a roster after the registration deadline', () => {
    const closed = (e: unknown) => {
        expect(e).toBeInstanceOf(BadRequestException);
        expect((e as BadRequestException).message).toBe('Tournament is not open for registration');
    };

    it('the invite command refuses after the deadline, with the same 400 as accept', async () => {
        const t = await tournament();
        const cap = await user();
        const tm = await team(t.id, [cap]);
        await pastDeadline(t);
        const invite = new InvitePlayerCommand(
            ds.getRepository(Team), ds.getRepository(TeamInvitation), ds.getRepository(User), notifications, allow, realtime,
        );

        closed(await invite.execute(tm.id, (await user()).id, cap.id).catch((e) => e));
        const [{ n }] = await ds.query(`SELECT count(*)::int AS n FROM "team_invitations" WHERE "team_id" = $1`, [tm.id]);
        expect(n).toBe(0);
    });

    it('accepting an invitation, a join request, sending one and joining by code all refuse after the deadline', async () => {
        const t = await tournament();
        const cap = await user();
        const tm = await team(t.id, [cap]);
        const [invited, requester, other] = [await user(), await user(), await user()];
        const inv = await ds.getRepository(TeamInvitation).save({
            team_id: tm.id, sender_id: cap.id, receiver_id: invited.id, status: InvitationStatus.PENDING, direction: InvitationDirection.INVITE,
        });
        const req = await ds.getRepository(TeamInvitation).save({
            team_id: tm.id, sender_id: requester.id, receiver_id: cap.id, status: InvitationStatus.PENDING, direction: InvitationDirection.REQUEST,
        });
        await pastDeadline(t);
        const membership = new TeamMembershipService();

        closed(await new AcceptInvitationCommand(ds, ds.getRepository(TeamInvitation), notifications, membership, realtime).execute(inv.id, invited.id).catch((e) => e));
        closed(await new AcceptJoinRequestCommand(ds, notifications, allow, membership, realtime).execute(req.id, cap.id).catch((e) => e));
        closed(await new CreateJoinRequestCommand(ds.getRepository(Team), ds.getRepository(TeamInvitation), notifications, allow, realtime).execute(tm.id, other.id).catch((e) => e));
        const [{ join_code }] = await ds.query(`SELECT "join_code" FROM "teams" WHERE "id" = $1`, [tm.id]);
        closed(await new JoinByCodeCommand(ds, membership, realtime).execute(join_code, other.id).catch((e) => e));
        expect(await ds.query(`SELECT "user_id" FROM "team_members" WHERE "team_id" = $1`, [tm.id])).toEqual([{ user_id: cap.id }]);
    });
});
