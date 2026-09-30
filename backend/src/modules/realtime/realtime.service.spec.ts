import { RealtimeService } from './realtime.service';
import { RealtimeEvents } from './realtime.events';

function mockServer() {
    const emit = jest.fn();
    const to = jest.fn(() => ({ emit }));
    return { server: { to } as any, to, emit };
}

describe('RealtimeService', () => {
    let service: RealtimeService;

    beforeEach(() => {
        service = new RealtimeService();
    });

    it.each([
        ['toUser', 'user:7'],
        ['toTeam', 'team:7'],
        ['toTournament', 'tournament:7'],
        ['toMatch', 'match:7'],
    ] as const)('%s targets the %s room', (method, room) => {
        const { server, to, emit } = mockServer();
        service.setServer(server);

        service[method](7, RealtimeEvents.MATCH_UPDATED, { id: 7, reason: 'test' });

        expect(to).toHaveBeenCalledTimes(1);
        expect(to).toHaveBeenCalledWith(room);
        expect(emit).toHaveBeenCalledWith('match:updated', { id: 7, reason: 'test' });
    });

    it('leaveTeamRoom removes the user\'s sockets from the team room', () => {
        const socketsLeave = jest.fn();
        const inFn = jest.fn(() => ({ socketsLeave }));
        service.setServer({ in: inFn } as any);

        service.leaveTeamRoom(7, 12);

        expect(inFn).toHaveBeenCalledWith('user:7');
        expect(socketsLeave).toHaveBeenCalledWith('team:12');
    });

    it('leaveTeamRoom never throws', () => {
        expect(() => service.leaveTeamRoom(1, 2)).not.toThrow();
        service.setServer({ in: () => { throw new Error('boom'); } } as any);
        expect(() => service.leaveTeamRoom(1, 2)).not.toThrow();
    });

    it('defaults the payload to an empty object', () => {
        const { server, emit } = mockServer();
        service.setServer(server);

        service.toTournament(1, RealtimeEvents.TOURNAMENT_UPDATED);

        expect(emit).toHaveBeenCalledWith('tournament:updated', {});
    });

    it('is a no-op before the server is attached', () => {
        expect(() => service.toUser(1, RealtimeEvents.INVITATION_RECEIVED, { id: 1 })).not.toThrow();
    });

    it('never throws when the socket layer does', () => {
        service.setServer({
            to: () => {
                throw new Error('boom');
            },
        } as any);

        expect(() => service.toTeam(1, RealtimeEvents.TEAM_UPDATED)).not.toThrow();
    });

    it('does not leak an event to a different id', () => {
        const { server, to } = mockServer();
        service.setServer(server);

        service.toTournament(1, RealtimeEvents.BRACKET_UPDATED);

        expect(to).not.toHaveBeenCalledWith('tournament:2');
        expect(to).not.toHaveBeenCalledWith('match:1');
    });
});
