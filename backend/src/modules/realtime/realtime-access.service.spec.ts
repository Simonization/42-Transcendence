import { RealtimeAccessService } from './realtime-access.service';

describe('RealtimeAccessService', () => {
    let teamRepo: { findOne: jest.Mock };
    let matchRepo: { findOne: jest.Mock };
    let userRepo: { findOne: jest.Mock };
    let service: RealtimeAccessService;

    beforeEach(() => {
        teamRepo = { findOne: jest.fn() };
        matchRepo = { findOne: jest.fn() };
        userRepo = { findOne: jest.fn() };
        service = new RealtimeAccessService(teamRepo as any, matchRepo as any, userRepo as any);
    });

    describe('parseTarget', () => {
        it('accepts a known channel with a positive integer id', () => {
            expect(service.parseTarget({ channel: 'tournament', id: 12 })).toEqual({ channel: 'tournament', id: 12 });
            expect(service.parseTarget({ channel: 'match', id: 1 })).toEqual({ channel: 'match', id: 1 });
            expect(service.parseTarget({ channel: 'team', id: 3 })).toEqual({ channel: 'team', id: 3 });
        });

        it('normalises numeric string ids', () => {
            expect(service.parseTarget({ channel: 'tournament', id: '42' })).toEqual({ channel: 'tournament', id: 42 });
        });

        it.each([
            ['null', null],
            ['a string', 'tournament:1'],
            ['an array', []],
            ['missing channel', { id: 1 }],
            ['unknown channel', { channel: 'user', id: 1 }],
            ['prototype key', { channel: '__proto__', id: 1 }],
            ['missing id', { channel: 'tournament' }],
            ['zero id', { channel: 'tournament', id: 0 }],
            ['negative id', { channel: 'tournament', id: -4 }],
            ['float id', { channel: 'tournament', id: 1.5 }],
            ['NaN id', { channel: 'tournament', id: NaN }],
            ['non-numeric string id', { channel: 'tournament', id: '1; DROP' }],
            ['exponent string id', { channel: 'tournament', id: '1e3' }],
            ['id above postgres int range', { channel: 'tournament', id: 2147483648 }],
            ['huge string id', { channel: 'tournament', id: '99999999999' }],
            ['object id', { channel: 'tournament', id: { $gt: 0 } }],
        ])('rejects %s', (_label, payload) => {
            expect(service.parseTarget(payload)).toBeNull();
        });
    });

    describe('canJoin: tournament', () => {
        it('lets any authenticated user in without querying', async () => {
            await expect(service.canJoin(5, { channel: 'tournament', id: 1 })).resolves.toBe(true);
            expect(teamRepo.findOne).not.toHaveBeenCalled();
            expect(matchRepo.findOne).not.toHaveBeenCalled();
        });
    });

    describe('canJoin: team', () => {
        it('allows a member', async () => {
            teamRepo.findOne.mockResolvedValue({ id: 9, members: [{ id: 1 }, { id: 5 }] });
            await expect(service.canJoin(5, { channel: 'team', id: 9 })).resolves.toBe(true);
            expect(teamRepo.findOne).toHaveBeenCalledWith({ where: { id: 9 }, relations: ['members'] });
        });

        it('refuses a non-member', async () => {
            teamRepo.findOne.mockResolvedValue({ id: 9, members: [{ id: 1 }] });
            await expect(service.canJoin(5, { channel: 'team', id: 9 })).resolves.toBe(false);
        });

        it('refuses when the team does not exist', async () => {
            teamRepo.findOne.mockResolvedValue(null);
            await expect(service.canJoin(5, { channel: 'team', id: 9 })).resolves.toBe(false);
        });

        it('does not treat the captain id as membership by itself', async () => {
            teamRepo.findOne.mockResolvedValue({ id: 9, captain_id: 5, members: [] });
            await expect(service.canJoin(5, { channel: 'team', id: 9 })).resolves.toBe(false);
        });
    });

    describe('canJoin: match', () => {
        it('allows a member of either team', async () => {
            userRepo.findOne.mockResolvedValue({ id: 5, role: 0 });
            matchRepo.findOne.mockResolvedValue({
                id: 3,
                team1: { members: [{ id: 1 }] }, team2: { members: [{ id: 5 }] },
            });
            await expect(service.canJoin(5, { channel: 'match', id: 3 })).resolves.toBe(true);
        });

        it('refuses a user who is on neither team', async () => {
            userRepo.findOne.mockResolvedValue({ id: 5, role: 0 });
            matchRepo.findOne.mockResolvedValue({
                id: 3,
                team1: { members: [{ id: 1 }] }, team2: { members: [{ id: 2 }] },
            });
            await expect(service.canJoin(5, { channel: 'match', id: 3 })).resolves.toBe(false);
        });

        it('refuses when the match has no teams yet or does not exist', async () => {
            userRepo.findOne.mockResolvedValue({ id: 5, role: 0 });
            matchRepo.findOne.mockResolvedValue({ id: 3, team1: null, team2: null });
            await expect(service.canJoin(5, { channel: 'match', id: 3 })).resolves.toBe(false);
            matchRepo.findOne.mockResolvedValue(null);
            await expect(service.canJoin(5, { channel: 'match', id: 3 })).resolves.toBe(false);
        });

        it.each([[1], [2]])('lets an admin (role %i) in without looking at the match', async (role) => {
            userRepo.findOne.mockResolvedValue({ id: 5, role });
            await expect(service.canJoin(5, { channel: 'match', id: 3 })).resolves.toBe(true);
            expect(matchRepo.findOne).not.toHaveBeenCalled();
        });
    });
});
