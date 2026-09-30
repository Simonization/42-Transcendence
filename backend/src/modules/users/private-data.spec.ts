/**
 * No read endpoint of the tournaments, teams or matches modules may put another user's private
 * data on the wire. Every user in the fixtures below carries every private field the entity has;
 * each response is serialised the way Nest does and searched for the keys and the values.
 */
import { TournamentsService } from '../tournaments/tournaments.service';
import { GetAllTournamentsQuery } from '../tournaments/queries/get-all-tournaments.query';
import { GetTournamentQuery } from '../tournaments/queries/get-tournament-details.query';
import { GetSeedingQuery } from '../tournaments/queries/get-seeding.query';
import { GetCheckinQuery } from '../tournaments/queries/get-checkin.query';
import { TournamentStatus } from '../tournaments/entities/tournament.entity';
import { TeamsService } from '../teams/teams.service';
import { GetMyInvitationsQuery } from '../teams/queries/get-my-invitations.query';
import { GetMyTeamForTournamentQuery } from '../teams/queries/get-my-team-for-tournament.query';
import { GetJoinRequestsQuery } from '../teams/queries/get-join-requests.query';
import { GetLookingForTeamQuery } from '../teams/queries/get-looking-for-team.query';
import { GetTeamProfileQuery } from '../teams/queries/get-team-profile.query';
import { MatchesService } from '../matches/matches.service';
import { GetMatchDetailsQuery } from '../matches/queries/get-match-details.query';
import { toPublicUser } from './public-user';
import { publicInvitation, publicLookingForTeam, publicMatch, publicTeam, publicTournament } from './public-views';

const SECRETS = ['secret.mail@example.org', 'hash-of-the-password', 'two-factor-code', 'verify-token', 'Firstname', 'Lastname'];
const PRIVATE_KEYS = [
    'mail', 'email', 'password', 'passwordHash', 'role', 'banUntil', 'isEmailVerified',
    'verificationToken', 'twoFactorEnabled', 'twoFactorCode', 'firstName', 'lastName',
];

/** Fails when any private key or value shows up anywhere in the serialised response. */
function expectNoPrivateUserData(response: unknown) {
    const json = JSON.stringify(response);
    expect(json).toBeTruthy();
    for (const key of PRIVATE_KEYS) expect(json).not.toMatch(new RegExp(`"${key}"\\s*:`));
    for (const secret of SECRETS) expect(json).not.toContain(secret);
}

/** A user as TypeORM loads it: everything selectable, private fields included. */
const user = (id: number): any => ({
    id,
    username: `player${id}`,
    avatarUrl: id % 2 ? `/avatars/${id}.png` : null,
    mail: SECRETS[0],
    passwordHash: SECRETS[1],
    role: 2,
    status: 1,
    banUntil: new Date('2030-01-01'),
    isEmailVerified: true,
    verificationToken: SECRETS[3],
    twoFactorEnabled: true,
    twoFactorCode: SECRETS[2],
    firstName: SECRETS[4],
    lastName: SECRETS[5],
    createdAt: new Date('2026-01-01'),
});

const team = (id: number, extra: object = {}): any => ({
    id,
    name: `Team ${id}`,
    status: 'LOCKED',
    checked_in_at: null,
    captain_id: id * 10 + 1,
    captain: user(id * 10 + 1),
    members: [user(id * 10 + 1), user(id * 10 + 2)],
    admins: [{ id: id, userId: id * 10 + 2, teamId: id, grantedBy: id * 10 + 1, user: user(id * 10 + 2) }],
    ...extra,
});

const match = (id: number, t1: any, t2: any): any => ({
    id,
    status: 'FINISHED',
    phase_id: 1,
    team1_id: t1.id,
    team2_id: t2.id,
    team1: t1,
    team2: t2,
    userMatches: [{ user_id: 11, match_id: id, result: 'WIN', user: user(11) }],
});

const invitation = (id: number): any => ({
    id,
    team_id: 1,
    sender_id: 11,
    receiver_id: 12,
    status: 'PENDING',
    direction: 'INVITE',
    sender: user(11),
    receiver: user(12),
    team: team(1),
});

const lft = (id: number): any => ({ id, userId: 12, tournamentId: 1, note: null, user: user(12) });

function tournament(): any {
    const t1 = team(1);
    const t2 = team(2);
    const phase: any = { id: 1, order: 1, type: 'SINGLE_ELIMINATION', game: { id: 1, name: 'Pong' }, matches: [] };
    phase.matches = [match(1, t1, t2)];
    return {
        id: 1,
        name: 'Cup',
        status: TournamentStatus.REGISTRATION_OPEN,
        max_participants: 8,
        seed_order: [1, 2],
        registration_closes_at: null,
        checkin_opens_at: new Date('2027-01-01T10:00:00Z'),
        scheduledAt: new Date('2027-01-01T18:00:00Z'),
        phases: [phase],
        teams: [t1, t2],
    };
}

const repoReturning = (value: any) => ({ findOne: jest.fn(async () => value), find: jest.fn(async () => value) }) as any;

describe('the fixtures really are private', () => {
    it('trips the detector when a raw entity is serialised', () => {
        expect(() => expectNoPrivateUserData(tournament())).toThrow();
        expect(() => expectNoPrivateUserData(invitation(1))).toThrow();
    });
});

describe('toPublicUser', () => {
    it('keeps id, username and avatar, and nothing else', () => {
        expect(toPublicUser(user(1))).toEqual({ id: 1, username: 'player1', avatarUrl: '/avatars/1.png' });
        expect(toPublicUser(user(2))).toEqual({ id: 2, username: 'player2', avatarUrl: null });
    });
});

describe('graph mappers', () => {
    it('do not mutate what they are given, and keep the shape', () => {
        const t = tournament();
        const out = publicTournament(t);
        expect(t.teams[0].members[0].mail).toBe(SECRETS[0]);
        expect(out.teams?.[0].members?.[0]).toEqual({ id: 11, username: 'player11', avatarUrl: '/avatars/11.png' });
        expect(out.teams?.[0].captain_id).toBe(11);
        expect(out.phases?.[0].matches?.[0].team1?.name).toBe('Team 1');
        expectNoPrivateUserData(out);
    });

    it('leave relations that were not loaded out', () => {
        const out = publicTeam({ id: 1, name: 'Solo', status: 'DRAFT' } as any);
        expect(Object.keys(out).sort()).toEqual(['id', 'name', 'status']);
    });

    it('cover teams, invitations, the looking-for-team board and matches', () => {
        expectNoPrivateUserData(publicTeam(team(1)));
        expectNoPrivateUserData(publicInvitation(invitation(1)));
        expectNoPrivateUserData(publicLookingForTeam(lft(1)));
        expectNoPrivateUserData(publicMatch(match(1, team(1), team(2))));
    });
});

describe('tournament read endpoints', () => {
    const service = (t: any) =>
        new TournamentsService(
            {} as any, {} as any, {} as any, {} as any, {} as any, {} as any,
            new GetAllTournamentsQuery(repoReturning([t])),
            new GetTournamentQuery(repoReturning(t)),
            new GetSeedingQuery(repoReturning(t)),
            new GetCheckinQuery(repoReturning(t)),
        );

    it('GET /tournaments', async () => {
        const out = await service(tournament()).findAll();
        expect(out[0].teams?.[0].members?.length).toBe(2);
        expectNoPrivateUserData(out);
    });

    it('GET /tournaments/:id', async () => {
        const out = await service(tournament()).findOne(1);
        expect(out.teams?.[0].members?.map((m) => m.username)).toEqual(['player11', 'player12']);
        expect(out.seeding).toBeDefined();
        expectNoPrivateUserData(out);
    });

    it('GET /tournaments/:id/seeding, /standings and /checkin', async () => {
        const svc = service(tournament());
        expectNoPrivateUserData(await svc.getSeeding(1));
        expectNoPrivateUserData(await svc.getStandings(1));
        expectNoPrivateUserData(await svc.getCheckin(1));
    });

    it('a started tournament with finished matches', async () => {
        const t = tournament();
        t.status = TournamentStatus.ONGOING;
        expectNoPrivateUserData(await service(t).findOne(1));
    });

    it('create and update answer with the same public shape', async () => {
        const t = tournament();
        const svc = new TournamentsService(
            { execute: async () => t } as any, { execute: async () => t } as any, {} as any, {} as any, {} as any, {} as any,
            {} as any, {} as any, {} as any, {} as any,
        );
        expectNoPrivateUserData(await svc.create({} as any));
        expectNoPrivateUserData(await svc.update(1, {} as any));
    });
});

describe('team read endpoints', () => {
    /** TeamsService has a long constructor; only the collaborators under test are set. */
    const service = (parts: Record<string, unknown>) => Object.assign(Object.create(TeamsService.prototype), parts) as TeamsService;

    it('GET /teams/invitations/my', async () => {
        const inviteRepo: any = { find: jest.fn(async () => [invitation(1), invitation(2)]) };
        const out = await service({ getInvitesQuery: new GetMyInvitationsQuery(inviteRepo) }).getMyInvitations(12);
        expect(out[0].sender).toEqual({ id: 11, username: 'player11', avatarUrl: '/avatars/11.png' });
        expectNoPrivateUserData(out);
    });

    it('GET /teams/mine', async () => {
        const status = {
            team: team(1),
            invitation: invitation(1),
            requests: [invitation(2)],
            teamSpotsLeft: 1,
            availability: null,
            lookingForTeam: lft(1),
        };
        const out = await service({ getMyTeamQuery: { execute: async () => status } }).getMyTeamForTournament(1, 11);
        expect(out.team?.members?.map((m) => m.username)).toEqual(['player11', 'player12']);
        expect(out.teamSpotsLeft).toBe(1);
        expectNoPrivateUserData(out);
    });

    it('GET /teams/:id/pending-invitations', async () => {
        const query = new GetMyTeamForTournamentQuery(
            { existsBy: jest.fn(async () => true) } as any,
            { find: jest.fn(async () => [invitation(1)]) } as any,
            {} as any, {} as any, {} as any,
        );
        expectNoPrivateUserData(await service({ getMyTeamQuery: query }).getTeamPendingInvitations(1, 11));
    });

    it('GET /teams/:id/requests', async () => {
        const query = new GetJoinRequestsQuery(
            { findOneBy: jest.fn(async () => ({ id: 1, captain_id: 11 })) } as any,
            { find: jest.fn(async () => [invitation(1)]) } as any,
            { assertAdmin: jest.fn(async () => undefined) } as any,
        );
        expectNoPrivateUserData(await service({ joinRequestsQuery: query }).getJoinRequests(1, 11));
    });

    it('GET /teams/lft/:tournamentId', async () => {
        const query = new GetLookingForTeamQuery({ find: jest.fn(async () => [lft(1), lft(2)]) } as any);
        const out = await service({ lftQuery: query }).listLookingForTeam(1);
        expect(out[0].user).toEqual({ id: 12, username: 'player12', avatarUrl: null });
        expectNoPrivateUserData(out);
    });

    it('GET /teams/:id/profile', async () => {
        const t = team(1, { tournament: tournament() });
        const teamRepo: any = { findOne: jest.fn(async () => t) };
        const tournamentRepo: any = { findOne: jest.fn(async () => tournament()) };
        const out = await new GetTeamProfileQuery(teamRepo, tournamentRepo).execute(1);
        expect(out.members.map((m) => m.username)).toEqual(['player11', 'player12']);
        expectNoPrivateUserData(out);
    });

    it('the commands that answer with a team or an invitation', async () => {
        const returnsTeam = { execute: async () => team(1), promote: async () => team(1) };
        const returnsInvite = { execute: async () => invitation(1) };
        const svc = service({
            createCmd: returnsTeam, kickCmd: returnsTeam, lockCmd: returnsTeam, unlockCmd: returnsTeam,
            renameCmd: returnsTeam, checkInCmd: returnsTeam, transferCmd: returnsTeam,
            inviteCmd: returnsInvite, cancelInviteCmd: returnsInvite, createRequestCmd: returnsInvite,
            declineRequestCmd: returnsInvite, declineCmd: returnsInvite,
            lftCmd: { flag: async () => lft(1) },
        });
        const results = await Promise.all([
            svc.create({} as any, user(11)), svc.kick(1, 12, 11), svc.lock(1, 11), svc.unlock(1, 11),
            svc.rename(1, 'x', 11), svc.checkIn(1, 11, false), svc.transferCaptaincy(1, 12, 11),
            svc.invite(1, 12, 11), svc.cancelInvitation(1, 11), svc.requestToJoin(1, 11), svc.declineJoinRequest(1, 11),
            svc.declineInvitation(1, 12), svc.flagLookingForTeam(1, 12),
        ]);
        expectNoPrivateUserData(results);
    });
});

describe('match read endpoints', () => {
    const repo = (value: any) => repoReturning(value);
    const service = (parts: Record<string, unknown>) => Object.assign(Object.create(MatchesService.prototype), parts) as MatchesService;
    const matches = () => [match(1, team(1), team(2)), match(2, team(3), team(4))];

    it('GET /matches/my-history and /matches/history/:userId', async () => {
        const svc = service({ getPlayerHistoryQuery: { execute: async () => matches() } });
        const mine = await svc.getHistory(11);
        expect(mine[0].team1?.members?.[0]).toEqual({ id: 11, username: 'player11', avatarUrl: '/avatars/11.png' });
        expectNoPrivateUserData(mine);
        expectNoPrivateUserData(await svc.getHistory(99));
    });

    it('GET /matches/:id and /matches/phase/:phaseId', async () => {
        const m = { ...matches()[0], phase: { id: 1, tournament: tournament() } };
        const svc = service({
            getMatchDetailsQuery: new GetMatchDetailsQuery(repo(m)),
            repo: repo(matches()),
        });
        expectNoPrivateUserData(await svc.findOne(1));
        expectNoPrivateUserData(await svc.findByPhase(1));
    });
});
