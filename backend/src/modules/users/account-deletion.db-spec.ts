/*
 * Account deletion (anonymisation) against real Postgres (npm run test:db): what is erased,
 * what is kept, what happens to teams, and that the account is locked out afterwards.
 */
import { NotFoundException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DataSource } from 'typeorm';
import { migratedDataSource } from '../../testing/test-db.testing-spec';
import { DeleteUserCommand } from './commands/delete-user.command';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { Team, TeamStatus } from '../teams/entities/team.entity';
import { TeamAdmin } from '../teams/entities/team-admin.entity';
import { Tournament, TournamentStatus } from '../tournaments/entities/tournament.entity';
import { TournamentPhase } from '../tournaments/entities/tournament-phase.entity';
import { Match, MatchStatus } from '../matches/entities/match.entity';
import { Chat } from '../chat/entities/chat.entity';
import { ChatParticipant } from '../chat/entities/chat-participant.entity';
import { Message } from '../chat/entities/message.entity';
import { GetChatHistoryQuery } from '../chat/queries/get-chat-history.query';
import { GetConversationsQuery } from '../chat/queries/get-conversations.query';
import { ChatPrivacyService } from '../chat/services/chat-privacy.service';
import { Friend } from '../friends/entities/friend.entity';
import { Block } from '../friends/entities/block.entity';
import { UserSettings } from './entities/user-settings.entity';
import { GetTeamProfileQuery } from '../teams/queries/get-team-profile.query';
import { JwtStrategy } from '../auth/strategies/jwt.strategy';
import { AuthService } from '../auth/auth.service';
import { RefreshToken } from './entities/refresh-token.entity';
import { AdminInvite } from '../auth/entities/admin-invite.entity';

const SECRET = 'test-secret-at-least-32-characters-long!!';
process.env.JWT_SECRET = process.env.JWT_SECRET || SECRET;

let ds: DataSource;
let users: UsersService;
let seq = 0;
const disconnect = jest.fn(async () => undefined);
const realtime = { toTeam: jest.fn(), toTournament: jest.fn(), toUser: jest.fn() };

beforeAll(async () => {
    ds = await migratedDataSource('account_deletion');
    await ds.query(`INSERT INTO "games" ("id", "name", "team_size") VALUES (1, 'Solo', 1), (2, 'Duo', 2)`);
    users = new UsersService(
        ds.getRepository(User),
        null as any,
        null as any,
        null as any,
        null as any,
        new DeleteUserCommand(ds),
        { disconnectUser: disconnect } as any,
        realtime as any,
    );
});

afterAll(async () => {
    await ds?.destroy();
});

async function user(name = 'u'): Promise<User> {
    const n = `${name}${++seq}`;
    const [{ id }] = await ds.query(
        `INSERT INTO "users" ("username", "mail", "password_hash", "firstName", "lastName", "avatarUrl",
                              "twoFactorEnabled", "twoFactorCode", "verificationToken", "isEmailVerified", "role")
         VALUES ($1, $2, '$2a$10$abcdefghijklmnopqrstuuJ8Qe1e5n6x5w5y5z5a5b5c5d5e5f5g', 'First', 'Last',
                 'https://img.test/a.png', true, '123456', 'tok', true, 1) RETURNING "id"`,
        [n, `${n}@example.test`],
    );
    await ds.query(`INSERT INTO "user_profiles" ("user_id", "display_name", "bio") VALUES ($1, $2, 'my bio')`, [id, n]);
    await ds.query(`INSERT INTO "user_settings" ("user_id", "openMessage") VALUES ($1, true)`, [id]);
    return ds.getRepository(User).findOneByOrFail({ id });
}

async function tournament(status: TournamentStatus, gameId = 2): Promise<Tournament> {
    const t = await ds.getRepository(Tournament).save({ name: `Cup ${++seq}`, status });
    await ds.getRepository(TournamentPhase).save({ tournament_id: t.id, order: 1, game_id: gameId, type: 'SINGLE_ELIMINATION' });
    return t;
}

/** A team with `members` in this roster order; the first is captain. */
async function team(t: Tournament, members: User[], status = TeamStatus.DRAFT): Promise<Team> {
    const saved = await ds.getRepository(Team).save({
        name: `Team ${++seq}`,
        status,
        captain_id: members[0].id,
        tournament: { id: t.id },
    });
    for (const m of members) {
        await ds.query(`INSERT INTO "team_members" ("team_id", "user_id") VALUES ($1, $2)`, [saved.id, m.id]);
    }
    return saved;
}

const count = async (sql: string, params: unknown[]) => (await ds.query(`SELECT count(*)::int AS n FROM ${sql}`, params))[0].n;
const membersOf = async (teamId: number) =>
    (await ds.query(`SELECT "user_id" FROM "team_members" WHERE "team_id" = $1 ORDER BY ctid`, [teamId])).map((r: any) => r.user_id);

describe('account deletion (anonymisation, real Postgres)', () => {
    it('erases the identity and every private relation, and keeps the messages the user sent', async () => {
        const alice = await user('alice');
        const bob = await user('bob');
        const carol = await user('carol');

        await ds.getRepository(Friend).save([
            { user1: Math.min(alice.id, bob.id), user2: Math.max(alice.id, bob.id), status: 1, actionUserId: alice.id },
            { user1: Math.min(alice.id, carol.id), user2: Math.max(alice.id, carol.id), status: 0, actionUserId: carol.id },
        ]);
        await ds.getRepository(Block).save([
            { blocker: { id: alice.id }, blocked: { id: carol.id } },
            { blocker: { id: carol.id }, blocked: { id: alice.id } },
        ] as any);
        const t = await tournament(TournamentStatus.REGISTRATION_OPEN);
        const bobsTeam = await team(t, [bob]);
        await ds.query(
            `INSERT INTO "team_invitations" ("team_id", "sender_id", "receiver_id", "direction") VALUES
             ($1, $2, $3, 'INVITE'), ($1, $3, $2, 'REQUEST')`,
            [bobsTeam.id, bob.id, alice.id],
        );
        await ds.query(`INSERT INTO "looking_for_team" ("user_id", "tournament_id") VALUES ($1, $2)`, [alice.id, t.id]);
        await ds.query(
            `INSERT INTO "notifications" ("user_id", "actor_id", "type", "body") VALUES
             ($1, NULL, 'info', 'for alice'), ($2, $1, 'friend_request', 'alice sent you a friend request'),
             ($2, NULL, 'info', 'for bob')`,
            [alice.id, bob.id],
        );
        await ds.query(`INSERT INTO "refresh_tokens" ("token", "userId", "user_id", "expires_at") VALUES ('r', $1, $1, now() + interval '1 day')`, [alice.id]);
        await ds.query(`INSERT INTO "user_game_accounts" ("userId", "user_id", "game", "game_account_id", "game_username") VALUES ($1, $1, 'g', 'x1', 'alice_g')`, [alice.id]);
        const [{ id: orgId }] = await ds.query(`INSERT INTO "organizations" ("name", "owner_id") VALUES ($1, $2) RETURNING "id"`, [`Org ${seq}`, bob.id]);
        await ds.query(`INSERT INTO "org_members" ("user_id", "org_id") VALUES ($1, $2)`, [alice.id, orgId]);

        const chat = await ds.getRepository(Chat).save({ type: 0, title: null });
        await ds.getRepository(ChatParticipant).save([{ chatId: chat.id, userId: alice.id }, { chatId: chat.id, userId: bob.id }]);
        await ds.getRepository(Message).save([
            { chatId: chat.id, senderId: alice.id, content: 'hi bob' },
            { chatId: chat.id, senderId: bob.id, content: 'hi alice' },
        ]);

        await users.remove(alice.id);

        const row = await ds.getRepository(User).findOneOrFail({
            where: { id: alice.id },
            select: ['id', 'username', 'mail', 'passwordHash', 'firstName', 'lastName', 'avatarUrl', 'twoFactorEnabled',
                'twoFactorCode', 'verificationToken', 'isEmailVerified', 'role', 'deletedAt'],
        });
        expect(row).toMatchObject({
            username: `deleted-user-${alice.id}`,
            mail: `deleted-user-${alice.id}`,
            passwordHash: '!',
            firstName: null,
            lastName: null,
            avatarUrl: null,
            twoFactorEnabled: false,
            twoFactorCode: null,
            verificationToken: null,
            isEmailVerified: false,
            role: 0,
        });
        expect(row.deletedAt).toBeInstanceOf(Date);

        const a = [alice.id];
        expect(await count(`"user_profiles" WHERE "user_id" = $1`, a)).toBe(0);
        expect(await count(`"user_settings" WHERE "user_id" = $1`, a)).toBe(0);
        expect(await count(`"friends" WHERE "user1" = $1 OR "user2" = $1`, a)).toBe(0);
        expect(await count(`"user_blocks" WHERE "blockerId" = $1 OR "blockedId" = $1`, a)).toBe(0);
        expect(await count(`"team_invitations" WHERE "sender_id" = $1 OR "receiver_id" = $1`, a)).toBe(0);
        expect(await count(`"looking_for_team" WHERE "user_id" = $1`, a)).toBe(0);
        expect(await count(`"notifications" WHERE "user_id" = $1 OR "actor_id" = $1`, a)).toBe(0);
        expect(await count(`"notifications" WHERE "user_id" = $1`, [bob.id])).toBe(1);
        expect(await count(`"refresh_tokens" WHERE "userId" = $1`, a)).toBe(0);
        expect(await count(`"user_game_accounts" WHERE "userId" = $1`, a)).toBe(0);
        expect(await count(`"org_members" WHERE "user_id" = $1`, a)).toBe(0);
        // Bob's friendship with carol etc. is untouched; only alice's rows went.
        expect(await count(`"messages" WHERE "chat_id" = $1`, [chat.id])).toBe(2);

        // Bob still sees the conversation; alice's message is from a deleted user.
        const history = await new GetChatHistoryQuery(ds.getRepository(Message), ds.getRepository(ChatParticipant)).execute(chat.id, bob.id);
        const fromAlice = history.find((m: any) => m.senderId === alice.id)!;
        expect(fromAlice.content).toBe('hi bob');
        expect(fromAlice.sender).toEqual({ id: alice.id, username: '', avatarUrl: null, isDeleted: true });
        const convs = await new GetConversationsQuery(ds.getRepository(Chat)).execute(bob.id, 10);
        expect(convs[0].participants).toContainEqual({ id: alice.id, username: '', isDeleted: true });

        // And can no longer write to it.
        const privacy = new ChatPrivacyService(ds.getRepository(Friend), ds.getRepository(Block), ds.getRepository(UserSettings), ds.getRepository(User));
        await expect(privacy.validateAccess(bob.id, alice.id)).rejects.toThrow('no longer exists');

        expect(disconnect).toHaveBeenCalledWith(alice.id, 'account_deleted');
    });

    it('locks the account out: JWTs, refresh tokens, login and 2FA are refused', async () => {
        const dave = await user('dave');
        const jwt = new JwtService({ secret: process.env.JWT_SECRET });
        const refresh = jwt.sign({ sub: dave.id, username: dave.username }, { expiresIn: '7d' });
        await ds.query(`INSERT INTO "refresh_tokens" ("token", "userId", "expires_at") VALUES ($1, $2, now() + interval '1 day')`, [refresh, dave.id]);
        const strategy = new JwtStrategy(ds.getRepository(User));
        await expect(strategy.validate({ sub: dave.id, username: dave.username })).resolves.toMatchObject({ id: dave.id });

        await users.remove(dave.id);

        await expect(strategy.validate({ sub: dave.id, username: dave.username })).rejects.toBeInstanceOf(UnauthorizedException);
        const auth = new AuthService(
            users,
            jwt,
            {} as any,
            ds.getRepository(User),
            ds.getRepository(RefreshToken),
            ds.getRepository(AdminInvite),
        );
        await expect(auth.refresh(refresh)).rejects.toBeInstanceOf(UnauthorizedException);
        await expect(auth.login({ username: dave.username, password: 'whatever1' } as any)).rejects.toBeInstanceOf(BadRequestException);
        await expect(auth.login({ username: `deleted-user-${dave.id}`, password: '!' } as any)).rejects.toBeInstanceOf(BadRequestException);
        await expect(auth.verify2FA(dave.id, '123456')).rejects.toBeInstanceOf(BadRequestException);
    });

    it('is not found by search and cannot be deleted twice', async () => {
        const erin = await user('erin');
        expect((await users.search(erin.username, 10)).map((u) => u.id)).toContain(erin.id);
        await users.remove(erin.id);
        expect((await users.search('deleted-user', 100)).map((u) => u.id)).not.toContain(erin.id);
        expect((await users.search('', 100)).map((u) => u.id)).not.toContain(erin.id);
        await expect(users.remove(erin.id)).rejects.toBeInstanceOf(NotFoundException);
    });

    describe('teams', () => {
        it('a DRAFT team: captaincy goes to a team admin first, even one who joined later', async () => {
            const [cap, early, admin] = [await user('cap'), await user('early'), await user('admin')];
            const t = await tournament(TournamentStatus.REGISTRATION_OPEN);
            const tm = await team(t, [cap, early, admin]);
            await ds.getRepository(TeamAdmin).save({ teamId: tm.id, userId: admin.id, grantedBy: cap.id });

            await users.remove(cap.id);

            const after = await ds.getRepository(Team).findOneByOrFail({ id: tm.id });
            expect(after.captain_id).toBe(admin.id);
            expect(await membersOf(tm.id)).toEqual([early.id, admin.id]);
            // The new captain needs no explicit admin row.
            expect(await count(`"team_admins" WHERE "team_id" = $1`, [tm.id])).toBe(0);
            expect(realtime.toTeam).toHaveBeenCalledWith(tm.id, 'team:updated', { id: tm.id, reason: 'member_deleted' });
        });

        it('a DRAFT team without admins: the longest-standing member becomes captain', async () => {
            const [cap, first, second] = [await user('cap'), await user('first'), await user('second')];
            const t = await tournament(TournamentStatus.REGISTRATION_OPEN);
            const tm = await team(t, [cap, first, second]);

            await users.remove(cap.id);

            expect((await ds.getRepository(Team).findOneByOrFail({ id: tm.id })).captain_id).toBe(first.id);
        });

        it('removes the user\'s admin rights in teams they did not captain', async () => {
            const [cap, adm] = [await user('cap'), await user('adm')];
            const t = await tournament(TournamentStatus.REGISTRATION_OPEN);
            const tm = await team(t, [cap, adm]);
            await ds.getRepository(TeamAdmin).save({ teamId: tm.id, userId: adm.id, grantedBy: cap.id });

            await users.remove(adm.id);

            expect(await count(`"team_admins" WHERE "user_id" = $1`, [adm.id])).toBe(0);
            expect(await membersOf(tm.id)).toEqual([cap.id]);
            expect((await ds.getRepository(Team).findOneByOrFail({ id: tm.id })).captain_id).toBe(cap.id);
        });

        it('a DRAFT team the user was alone in is deleted, with its invitations', async () => {
            const [solo, invited] = [await user('solo'), await user('invited')];
            const t = await tournament(TournamentStatus.REGISTRATION_OPEN);
            const tm = await team(t, [solo]);
            const other = await team(t, [invited]);
            await ds.query(`INSERT INTO "team_invitations" ("team_id", "sender_id", "receiver_id") VALUES ($1, $2, $3)`, [tm.id, solo.id, invited.id]);

            await users.remove(solo.id);

            expect(await ds.getRepository(Team).findOneBy({ id: tm.id })).toBeNull();
            expect(await count(`"team_invitations" WHERE "team_id" = $1`, [tm.id])).toBe(0);
            expect(await ds.getRepository(Team).findOneBy({ id: other.id })).not.toBeNull();
        });

        it('a LOCKED team before start that drops below the team size goes back to DRAFT', async () => {
            const [cap, mate] = [await user('cap'), await user('mate')];
            const t = await tournament(TournamentStatus.REGISTRATION_OPEN, 2);
            const tm = await team(t, [cap, mate], TeamStatus.LOCKED);
            await ds.query(`UPDATE "teams" SET "checked_in_at" = now() WHERE "id" = $1`, [tm.id]);

            await users.remove(mate.id);

            const after = await ds.getRepository(Team).findOneByOrFail({ id: tm.id });
            expect(after.status).toBe(TeamStatus.DRAFT);
            expect(after.checked_in_at).toBeNull();
            expect(await membersOf(tm.id)).toEqual([cap.id]);
        });

        it('a LOCKED team in a running tournament keeps its roster and its bracket place; the captaincy moves on', async () => {
            const [cap, mate, opp] = [await user('cap'), await user('mate'), await user('opp')];
            const t = await tournament(TournamentStatus.ONGOING, 2);
            const tm = await team(t, [cap, mate], TeamStatus.LOCKED);
            const rival = await team(t, [opp], TeamStatus.LOCKED);
            const match = await ds.getRepository(Match).save({
                tournament_id: t.id, team1_id: tm.id, team2_id: rival.id, status: MatchStatus.READY, round_order: 1,
            });

            await users.remove(cap.id);

            const after = await ds.getRepository(Team).findOneByOrFail({ id: tm.id });
            expect(after).toMatchObject({ status: TeamStatus.LOCKED, captain_id: mate.id });
            expect(await membersOf(tm.id)).toEqual([cap.id, mate.id]);
            expect(await ds.getRepository(Match).findOneByOrFail({ id: match.id })).toMatchObject({
                team1_id: tm.id, team2_id: rival.id, status: MatchStatus.READY,
            });

            const profile = await new GetTeamProfileQuery(ds.getRepository(Team), ds.getRepository(Tournament)).execute(tm.id);
            expect(profile.captainless).toBe(false);
            expect(profile.members.find((m) => m.id === cap.id)).toMatchObject({ username: '', isDeleted: true, avatarUrl: null });
        });

        it('a team with history whose last member leaves stays as a captainless shell', async () => {
            const [solo, opp] = [await user('solo'), await user('opp')];
            const t = await tournament(TournamentStatus.COMPLETED, 1);
            const tm = await team(t, [solo], TeamStatus.ARCHIVED);
            const rival = await team(t, [opp], TeamStatus.ARCHIVED);
            const phase = await ds.getRepository(TournamentPhase).findOneByOrFail({ tournament_id: t.id });
            await ds.getRepository(Match).save({
                phase_id: phase.id, tournament_id: t.id, team1_id: tm.id, team2_id: rival.id, status: MatchStatus.FINISHED,
                winner_id: tm.id, round_order: 1, team1_score: 2, team2_score: 0,
            });

            await users.remove(solo.id);

            const after = await ds.getRepository(Team).findOneByOrFail({ id: tm.id });
            expect(after).toMatchObject({ status: TeamStatus.ARCHIVED, captain_id: solo.id });
            const profile = await new GetTeamProfileQuery(ds.getRepository(Team), ds.getRepository(Tournament)).execute(tm.id);
            expect(profile.captainless).toBe(true);
            expect(profile.matches[0]).toMatchObject({ result: 'W' });
        });
    });
});
