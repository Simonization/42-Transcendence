import { RealtimeGateway } from './realtime.gateway';
import { RealtimeService } from './realtime.service';
import { RealtimeAccessService } from './realtime-access.service';

function makeClient(overrides: Record<string, any> = {}) {
    return {
        handshake: { auth: { token: 'Bearer good' }, headers: {} },
        data: {} as Record<string, any>,
        join: jest.fn().mockResolvedValue(undefined),
        leave: jest.fn().mockResolvedValue(undefined),
        ...overrides,
    } as any;
}

describe('RealtimeGateway', () => {
    let jwt: { verify: jest.Mock };
    let userRepo: { findOne: jest.Mock };
    let access: jest.Mocked<Pick<RealtimeAccessService, 'parseTarget' | 'canJoin'>>;
    let realtime: RealtimeService;
    let gateway: RealtimeGateway;

    beforeEach(() => {
        jwt = { verify: jest.fn(() => ({ sub: 7, username: 'u' })) };
        userRepo = { findOne: jest.fn(async () => ({ id: 7, status: 0, banUntil: null })) };
        access = { parseTarget: jest.fn(), canJoin: jest.fn() };
        realtime = new RealtimeService();
        gateway = new RealtimeGateway(jwt as any, realtime, access as any, userRepo as any);
    });

    it('hands the shared server to the service once initialised', () => {
        const spy = jest.spyOn(realtime, 'setServer');
        const server = {} as any;
        gateway.afterInit(server);
        expect(spy).toHaveBeenCalledWith(server);
    });

    describe('handleConnection', () => {
        it('puts an authenticated socket into its user room', async () => {
            const client = makeClient();
            await gateway.handleConnection(client);
            expect(client.join).toHaveBeenCalledWith('user:7');
            expect(client.data.user).toEqual({ sub: 7, username: 'u' });
        });

        it('does not overwrite the identity ChatGateway already set', async () => {
            const client = makeClient({ data: { user: { sub: 7, username: 'from-chat' } } });
            await gateway.handleConnection(client);
            expect(client.data.user.username).toBe('from-chat');
        });

        it('ignores a socket without a token', async () => {
            const client = makeClient({ handshake: { auth: {}, headers: {} } });
            await gateway.handleConnection(client);
            expect(client.join).not.toHaveBeenCalled();
        });

        it('ignores a socket whose token does not verify', async () => {
            jwt.verify.mockImplementation(() => {
                throw new Error('bad');
            });
            const client = makeClient();
            await gateway.handleConnection(client);
            expect(client.join).not.toHaveBeenCalled();
        });

        it('ignores a banned user', async () => {
            userRepo.findOne.mockResolvedValue({ id: 7, status: 1, banUntil: null });
            const client = makeClient();
            await gateway.handleConnection(client);
            expect(client.join).not.toHaveBeenCalled();
        });
    });

    describe('subscribe', () => {
        const authed = () => makeClient({ data: { user: { sub: 7 } } });

        it('joins the room when the target is valid and allowed', async () => {
            access.parseTarget.mockReturnValue({ channel: 'tournament', id: 4 });
            access.canJoin.mockResolvedValue(true);
            const client = authed();

            await expect(gateway.handleSubscribe(client, {})).resolves.toEqual({ ok: true });
            expect(access.canJoin).toHaveBeenCalledWith(7, { channel: 'tournament', id: 4 });
            expect(client.join).toHaveBeenCalledWith('tournament:4');
        });

        it('refuses without joining when the access check fails', async () => {
            access.parseTarget.mockReturnValue({ channel: 'team', id: 9 });
            access.canJoin.mockResolvedValue(false);
            const client = authed();

            await expect(gateway.handleSubscribe(client, {})).resolves.toEqual({ ok: false, error: 'forbidden' });
            expect(client.join).not.toHaveBeenCalled();
        });

        it('rejects an invalid body without touching the database', async () => {
            access.parseTarget.mockReturnValue(null);
            const client = authed();

            await expect(gateway.handleSubscribe(client, 'garbage')).resolves.toEqual({
                ok: false,
                error: 'invalid_request',
            });
            expect(access.canJoin).not.toHaveBeenCalled();
            expect(client.join).not.toHaveBeenCalled();
        });

        it('rejects a socket that has no authenticated user', async () => {
            access.parseTarget.mockReturnValue({ channel: 'tournament', id: 4 });
            const client = makeClient();

            await expect(gateway.handleSubscribe(client, {})).resolves.toEqual({
                ok: false,
                error: 'invalid_request',
            });
            expect(client.join).not.toHaveBeenCalled();
        });
    });

    describe('unsubscribe', () => {
        it('leaves the room for a valid target', async () => {
            access.parseTarget.mockReturnValue({ channel: 'match', id: 2 });
            const client = makeClient();

            await expect(gateway.handleUnsubscribe(client, {})).resolves.toEqual({ ok: true });
            expect(client.leave).toHaveBeenCalledWith('match:2');
        });

        it('rejects an invalid body', async () => {
            access.parseTarget.mockReturnValue(null);
            const client = makeClient();

            await expect(gateway.handleUnsubscribe(client, null)).resolves.toEqual({
                ok: false,
                error: 'invalid_request',
            });
            expect(client.leave).not.toHaveBeenCalled();
        });
    });
});
