/*
 * Google sign-in against real Postgres (npm run test:db): GoogleStrategy.validate finds or
 * creates the user (CreateUserCommand), AuthService.googleLogin only issues tokens for it, and
 * a taken username never fails the OAuth callback.
 */
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DataSource } from 'typeorm';
import { migratedDataSource } from '../../testing/test-db.testing-spec';
import { CreateUserCommand } from '../users/commands/create-user.command';
import { User } from '../users/entities/user.entity';
import { RefreshToken } from '../users/entities/refresh-token.entity';
import { AdminInvite } from './entities/admin-invite.entity';
import { AuthService } from './auth.service';
import { GoogleStrategy } from './strategies/google.strategy';

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-at-least-32-characters-long!!';
process.env.GOOGLE_CLIENT_ID = 'test-client-id';
process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret';

let ds: DataSource;
let strategy: GoogleStrategy;
let auth: AuthService;

beforeAll(async () => {
    ds = await migratedDataSource('google_oauth');
    strategy = new GoogleStrategy(new CreateUserCommand(ds.getRepository(User)));
    auth = new AuthService(
        null as any,
        new JwtService({ secret: process.env.JWT_SECRET }),
        {} as any,
        ds.getRepository(User),
        ds.getRepository(RefreshToken),
        ds.getRepository(AdminInvite),
    );
});

afterAll(async () => {
    await ds?.destroy();
});

afterEach(() => {
    jest.restoreAllMocks();
});

/** What passport hands to `validate` for a Google account. */
function profile(mail: string) {
    return { emails: [{ value: mail }], photos: [{ value: 'https://img.test/g.png' }], name: {} };
}

/** Runs the strategy the way passport does and returns what it passes to `done`. */
async function signIn(mail: string): Promise<User> {
    const done = jest.fn();
    await strategy.validate('access', 'refresh', profile(mail), done);
    expect(done).toHaveBeenCalledTimes(1);
    expect(done.mock.calls[0][0]).toBeNull();
    return done.mock.calls[0][1];
}

async function insertUser(username: string, mail: string): Promise<number> {
    const [{ id }] = await ds.query(
        `INSERT INTO "users" ("username", "mail", "password_hash", "isEmailVerified") VALUES ($1, $2, 'x', true) RETURNING "id"`,
        [username, mail],
    );
    return id;
}

const countUsers = async (): Promise<number> => ds.getRepository(User).count();

describe('Google sign-in', () => {
    it('creates a verified user for a new Google account and logs them in', async () => {
        const user = await signIn('newbie@example.test');
        expect(user.id).toBeGreaterThan(0);
        expect(user.mail).toBe('newbie@example.test');
        expect(user.username).toMatch(/^newbie\d+$/);
        expect(user.isEmailVerified).toBe(true);

        const stored = await ds.getRepository(User).findOneOrFail({ where: { id: user.id }, relations: ['profile', 'settings'] });
        expect(stored.profile.avatarUrl).toBe('https://img.test/g.png');
        expect(stored.settings).toBeTruthy();

        const result = await auth.googleLogin(user);
        expect(result).toMatchObject({ user: { id: user.id, username: user.username, mail: user.mail } });
        expect(result).toHaveProperty('accessToken');
        expect(await ds.getRepository(RefreshToken).count({ where: { userId: user.id } })).toBe(1);
    });

    it('finds the existing user the second time: no duplicate, same account', async () => {
        const first = await signIn('returning@example.test');
        const before = await countUsers();

        const second = await signIn('returning@example.test');
        expect(second.id).toBe(first.id);
        expect(second.username).toBe(first.username);
        expect(await countUsers()).toBe(before);
        expect(await auth.googleLogin(second)).toHaveProperty('accessToken');
    });

    it('signs an account that registered with email and password into that same account', async () => {
        const id = await insertUser('classic', 'classic@example.test');
        const before = await countUsers();
        const user = await signIn('classic@example.test');
        expect(user.id).toBe(id);
        expect(user.username).toBe('classic');
        expect(await countUsers()).toBe(before);
    });

    it('googleLogin does not create accounts: an unknown mail is refused', async () => {
        const before = await countUsers();
        await expect(auth.googleLogin({ mail: 'nobody@example.test' })).rejects.toBeInstanceOf(UnauthorizedException);
        expect(await countUsers()).toBe(before);
    });

    it('asks for 2FA instead of tokens when the user has it enabled', async () => {
        const user = await signIn('twofa@example.test');
        await ds.getRepository(User).update(user.id, { twoFactorEnabled: true });
        const mailer = { send2FACode: jest.fn().mockResolvedValue(undefined) };
        const withMail = new AuthService(
            null as any,
            new JwtService({ secret: process.env.JWT_SECRET }),
            mailer as any,
            ds.getRepository(User),
            ds.getRepository(RefreshToken),
            ds.getRepository(AdminInvite),
        );
        const fresh = await ds.getRepository(User).findOneByOrFail({ id: user.id });
        expect(await withMail.googleLogin(fresh)).toMatchObject({ requiresTwoFactor: true, userId: user.id });
        expect(mailer.send2FACode).toHaveBeenCalledTimes(1);
    });

    describe('username collisions', () => {
        it('takes a fresh suffix when the generated username is already taken', async () => {
            await insertUser('alice123', 'someone-else@example.test');
            // First candidate: alice123 (taken), second: alice456.
            jest.spyOn(Math, 'random').mockReturnValueOnce(0.123).mockReturnValueOnce(0.456);

            const user = await signIn('alice@example.test');
            expect(user.username).toBe('alice456');
            expect(user.mail).toBe('alice@example.test');
            expect(await ds.getRepository(User).countBy({ username: 'alice123' })).toBe(1);
        });

        it('retries when another sign-in takes the username between the check and the insert', async () => {
            await insertUser('bob7', 'other-bob@example.test');
            const repo = ds.getRepository(User);
            // Hide the taken username from the pre-check once: the insert then hits the unique index.
            const realFindOne = repo.findOne.bind(repo);
            let hidden = false;
            jest.spyOn(repo, 'findOne').mockImplementation(((options: any) => {
                if (!hidden && options?.where?.username === 'bob7') {
                    hidden = true;
                    return Promise.resolve(null);
                }
                return realFindOne(options);
            }) as any);
            jest.spyOn(Math, 'random').mockReturnValueOnce(0.007).mockReturnValueOnce(0.008);

            const racing = new GoogleStrategy(new CreateUserCommand(repo));
            const done = jest.fn();
            await racing.validate('a', 'r', profile('bob@example.test'), done);
            expect(hidden).toBe(true);
            expect(done.mock.calls[0][1].username).toBe('bob8');
        });

        it('gives up with a 409 after a bounded number of attempts, never loops', async () => {
            await insertUser('carol0', 'other-carol@example.test');
            const random = jest.spyOn(Math, 'random').mockReturnValue(0);
            const done = jest.fn();
            await expect(strategy.validate('a', 'r', profile('carol@example.test'), done)).rejects.toBeInstanceOf(ConflictException);
            expect(random.mock.calls.length).toBeLessThanOrEqual(20);
            expect(done).not.toHaveBeenCalled();
            expect(await ds.getRepository(User).countBy({ mail: 'carol@example.test' })).toBe(0);
        });
    });
});
