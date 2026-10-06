import { ChatGateway } from './chat.gateway';

function makeClient(overrides: Record<string, any> = {}) {
    const rooms = new Set<string>();
    const emit = jest.fn();
    return {
        handshake: { auth: { token: 'Bearer good' }, headers: {} },
        data: { user: { sub: 7, username: 'u' } } as Record<string, any>,
        rooms,
        join: jest.fn(async (room: string) => void rooms.add(room)),
        leave: jest.fn(async (room: string) => void rooms.delete(room)),
        broadcast: { to: jest.fn(() => ({ emit })) },
        emitted: emit,
        ...overrides,
    } as any;
}

describe('ChatGateway rooms', () => {
    let participants: Set<string>;
    let gateway: ChatGateway;
    let jwt: { verify: jest.Mock };

    beforeEach(() => {
        participants = new Set(['5:7']);
        const partRepo = { existsBy: jest.fn(async ({ chatId, userId }) => participants.has(`${chatId}:${userId}`)) };
        jwt = { verify: jest.fn(() => ({ sub: 7, username: 'u' })) };
        gateway = new ChatGateway(jwt as any, partRepo as any, {} as any, {} as any);
    });

    it('lets a participant join the chat room', async () => {
        const client = makeClient();
        await expect(gateway.handleJoinRoom(client, { roomId: 5 })).resolves.toEqual({ ok: true });
        expect(client.join).toHaveBeenCalledWith('room_5');
    });

    it('refuses a socket that is not in the chat, so it never sees typing or read receipts', async () => {
        const client = makeClient({ data: { user: { sub: 8, username: 'outsider' } } });
        await expect(gateway.handleJoinRoom(client, { roomId: 5 })).resolves.toEqual({ ok: false });
        expect(client.join).not.toHaveBeenCalled();
    });

    it('refuses junk room ids', async () => {
        const client = makeClient();
        for (const roomId of [undefined, 0, -1, 1.5, 'x'] as any[]) {
            await expect(gateway.handleJoinRoom(client, { roomId })).resolves.toEqual({ ok: false });
        }
        expect(client.join).not.toHaveBeenCalled();
    });

    it('identifies a socket from its token when it emits before handleConnection finished', async () => {
        const client = makeClient({ data: {} });
        await expect(gateway.handleJoinRoom(client, { roomId: 5 })).resolves.toEqual({ ok: true });
        jwt.verify.mockImplementation(() => {
            throw new Error('bad');
        });
        await expect(gateway.handleJoinRoom(makeClient({ data: {} }), { roomId: 5 })).resolves.toEqual({ ok: false });
    });

    it('relays typing only from a socket inside the room', async () => {
        const outsider = makeClient({ data: { user: { sub: 8 } } });
        gateway.handleTyping(outsider, { roomId: 5, isTyping: true });
        expect(outsider.broadcast.to).not.toHaveBeenCalled();

        const member = makeClient();
        await gateway.handleJoinRoom(member, { roomId: 5 });
        gateway.handleTyping(member, { roomId: 5, isTyping: true });
        expect(member.broadcast.to).toHaveBeenCalledWith('room_5');
        expect(member.emitted).toHaveBeenCalledWith('userTyping', { roomId: 5, userId: 7, isTyping: true });
    });
});
