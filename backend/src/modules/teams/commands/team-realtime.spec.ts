import { RealtimeEvents } from '../../realtime/realtime.events';
import { InvitePlayerCommand } from './invite-player.command';
import { AcceptInvitationCommand } from './accept-invitation.command';
import { DeclineInvitationCommand } from './decline-invitation.command';
import { CancelInvitationCommand } from './cancel-invitation.command';
import { KickPlayerCommand } from './kick-player.command';
import { LockTeamCommand } from './lock-team.command';
import { UnlockTeamCommand } from './unlock-team.command';
import { LeaveTeamCommand } from './leave-team.command';
import { DeleteTeamCommand } from './delete-team.command';
import { CreateTeamCommand } from './create-team.command';
import { CreateJoinRequestCommand } from './create-join-request.command';
import { AcceptJoinRequestCommand } from './accept-join-request.command';
import { DeclineJoinRequestCommand } from './decline-join-request.command';
import { JoinByCodeCommand } from './join-by-code.command';
import { LookingForTeamCommand } from './looking-for-team.command';
import { TeamMembershipService } from '../services/team-membership.service';
import { TeamStatus } from '../entities/team.entity';
import { InvitationDirection, InvitationStatus } from '../entities/team-invitation.entity';
import { TournamentStatus } from '../../tournaments/entities/tournament.entity';
import {
    mockDataSource, mockNotifications, mockPermissions, mockQueryBuilder, mockRealtime, mockRepo,
} from '../testing/test-mocks-spec';

/**
 * What each teams command publishes over the realtime layer (docs/realtime.md, "Teams").
 * The commands' own behaviour is covered by their other specs; here only the RealtimeService
 * calls are asserted.
 */

const { TEAM_UPDATED, TOURNAMENT_UPDATED, INVITATION_RECEIVED } = RealtimeEvents;

const CAPTAIN = 1;
const USER = 7;

const teamFixture = (over: any = {}) => ({
    id: 5,
    name: 'Blues',
    status: TeamStatus.DRAFT,
    captain_id: CAPTAIN,
    members: [{ id: CAPTAIN }],
    tournament: {
        id: 9,
        status: TournamentStatus.REGISTRATION_OPEN,
        phases: [{ order: 1, game: { teamSize: 2 } }],
    },
    ...over,
});

describe('teams realtime publishing', () => {
    describe('invitations', () => {
        it('invite: tells the invitee and the team', async () => {
            const realtime = mockRealtime();
            const teamRepo = mockRepo({ findOne: jest.fn().mockResolvedValue(teamFixture()) });
            const inviteRepo = mockRepo({
                findOne: jest.fn().mockResolvedValue(null),
                save: jest.fn(async (x) => ({ ...x, id: 33 })),
            });
            const userRepo = mockRepo({ findOne: jest.fn().mockResolvedValue({ id: CAPTAIN, username: 'cap' }) });
            const command = new InvitePlayerCommand(
                teamRepo, inviteRepo, userRepo, mockNotifications(), mockPermissions(), realtime,
            );

            await command.execute(5, USER, CAPTAIN);

            expect(realtime.toUser).toHaveBeenCalledWith(USER, INVITATION_RECEIVED, { id: 33, reason: 'invited' });
            expect(realtime.toTeam).toHaveBeenCalledWith(5, TEAM_UPDATED, { id: 5, reason: 'invitation_sent' });
        });

        it('invite: publishes nothing when the command is refused', async () => {
            const realtime = mockRealtime();
            const teamRepo = mockRepo({ findOne: jest.fn().mockResolvedValue(teamFixture({ status: TeamStatus.LOCKED })) });
            const command = new InvitePlayerCommand(
                teamRepo, mockRepo(), mockRepo(), mockNotifications(), mockPermissions(), realtime,
            );

            await expect(command.execute(5, USER, CAPTAIN)).rejects.toThrow();

            expect(realtime.toUser).not.toHaveBeenCalled();
            expect(realtime.toTeam).not.toHaveBeenCalled();
        });

        it('accept: after commit, tells the team, the inviter and the tournament (LFT board)', async () => {
            const realtime = mockRealtime();
            const team = teamFixture();
            const invite = { id: 11, sender_id: CAPTAIN, receiver_id: USER, status: InvitationStatus.PENDING, team };
            const ctx = mockDataSource();
            ctx.manager.findOne.mockResolvedValue(invite);
            ctx.manager.findOneBy.mockResolvedValue({ id: USER, username: 'neo' });
            ctx.manager.createQueryBuilder.mockReturnValue(mockQueryBuilder({ many: [] }));
            const command = new AcceptInvitationCommand(
                ctx.dataSource, mockRepo(), mockNotifications(), new TeamMembershipService(), realtime,
            );
            ctx.runner.commitTransaction.mockImplementation(async () => {
                expect(realtime.toTeam).not.toHaveBeenCalled();
            });

            await command.execute(11, USER);

            expect(realtime.toTeam).toHaveBeenCalledWith(5, TEAM_UPDATED, { id: 5, reason: 'member_joined' });
            expect(realtime.toUser).toHaveBeenCalledWith(CAPTAIN, INVITATION_RECEIVED, { id: 11, reason: 'invitation_accepted' });
            expect(realtime.toTournament).toHaveBeenCalledWith(9, TOURNAMENT_UPDATED, { id: 9, reason: 'looking_for_team_changed' });
        });

        it('accept: also updates the draft team the user was pulled out of', async () => {
            const realtime = mockRealtime();
            const soloDraft = { id: 3, name: 'Solo', status: TeamStatus.DRAFT, captain_id: USER, members: [{ id: USER }] };
            const duoDraft = { id: 4, name: 'Duo', status: TeamStatus.DRAFT, captain_id: 50, members: [{ id: 50 }, { id: USER }] };
            const invite = { id: 11, sender_id: CAPTAIN, receiver_id: USER, status: InvitationStatus.PENDING, team: teamFixture() };
            const ctx = mockDataSource();
            ctx.manager.findOne.mockResolvedValue(invite);
            ctx.manager.findOneBy.mockResolvedValue({ id: USER, username: 'neo' });
            ctx.manager.createQueryBuilder.mockReturnValue(mockQueryBuilder({ many: [soloDraft, duoDraft] }));
            const command = new AcceptInvitationCommand(
                ctx.dataSource, mockRepo(), mockNotifications(), new TeamMembershipService(), realtime,
            );

            await command.execute(11, USER);

            expect(realtime.toTeam).toHaveBeenCalledWith(3, TEAM_UPDATED, { id: 3, reason: 'team_deleted' });
            expect(realtime.toTeam).toHaveBeenCalledWith(4, TEAM_UPDATED, { id: 4, reason: 'member_left' });
            expect(realtime.toTournament).toHaveBeenCalledWith(9, TOURNAMENT_UPDATED, { id: 9, reason: 'team_deleted' });
            expect(realtime.leaveTeamRoom).toHaveBeenCalledWith(USER, 3);
            expect(realtime.leaveTeamRoom).toHaveBeenCalledWith(USER, 4);
        });

        it('decline: tells the inviter and the team', async () => {
            const realtime = mockRealtime();
            const invite = { id: 11, team_id: 5, sender_id: CAPTAIN, receiver_id: USER, status: InvitationStatus.PENDING };
            const command = new DeclineInvitationCommand(mockRepo({ findOneBy: jest.fn().mockResolvedValue(invite) }), realtime);

            await command.execute(11, USER);

            expect(realtime.toUser).toHaveBeenCalledWith(CAPTAIN, INVITATION_RECEIVED, { id: 11, reason: 'invitation_declined' });
            expect(realtime.toTeam).toHaveBeenCalledWith(5, TEAM_UPDATED, { id: 5, reason: 'invitation_declined' });
        });

        it('cancel: an invite reaches the invitee, a join request only the team', async () => {
            const build = (invite: any) => {
                const realtime = mockRealtime();
                const command = new CancelInvitationCommand(
                    mockRepo({ findOne: jest.fn().mockResolvedValue(invite) }),
                    mockRepo({ findOneBy: jest.fn().mockResolvedValue(teamFixture()) }),
                    mockPermissions(),
                    realtime,
                );
                return { realtime, command };
            };
            const base = { id: 11, team_id: 5, sender_id: CAPTAIN, receiver_id: 8, status: InvitationStatus.PENDING };

            const invite = build({ ...base, direction: InvitationDirection.INVITE });
            await invite.command.execute(11, CAPTAIN);
            expect(invite.realtime.toUser).toHaveBeenCalledWith(8, INVITATION_RECEIVED, { id: 11, reason: 'invitation_cancelled' });
            expect(invite.realtime.toTeam).toHaveBeenCalledWith(5, TEAM_UPDATED, { id: 5, reason: 'invitation_cancelled' });

            const request = build({ ...base, sender_id: 8, receiver_id: CAPTAIN, direction: InvitationDirection.REQUEST });
            await request.command.execute(11, 8);
            expect(request.realtime.toUser).not.toHaveBeenCalled();
            expect(request.realtime.toTeam).toHaveBeenCalledWith(5, TEAM_UPDATED, { id: 5, reason: 'invitation_cancelled' });
        });
    });

    describe('roster and status', () => {
        it('kick: tells the team and the kicked user, and evicts their sockets from the team room', async () => {
            const realtime = mockRealtime();
            const team = teamFixture({ members: [{ id: CAPTAIN }, { id: USER }] });
            const command = new KickPlayerCommand(
                mockRepo({ findOne: jest.fn().mockResolvedValue(team) }),
                mockRepo({ existsBy: jest.fn().mockResolvedValue(false) }),
                mockPermissions(),
                mockNotifications(),
                realtime,
            );

            await command.execute(5, USER, CAPTAIN);

            expect(realtime.toTeam).toHaveBeenCalledWith(5, TEAM_UPDATED, { id: 5, reason: 'member_kicked' });
            expect(realtime.toUser).toHaveBeenCalledWith(USER, INVITATION_RECEIVED, { id: 5, reason: 'kicked' });
            expect(realtime.leaveTeamRoom).toHaveBeenCalledWith(USER, 5);
        });

        it('lock / unlock: tell the team and the tournament (registered count changes)', async () => {
            const lockRt = mockRealtime();
            const full = teamFixture({ members: [{ id: CAPTAIN }, { id: 2 }] });
            await new LockTeamCommand(
                mockRepo({ findOne: jest.fn().mockResolvedValue(full), count: jest.fn().mockResolvedValue(0) }),
                mockPermissions(),
                lockRt,
            ).execute(5, CAPTAIN);
            expect(lockRt.toTeam).toHaveBeenCalledWith(5, TEAM_UPDATED, { id: 5, reason: 'team_locked' });
            expect(lockRt.toTournament).toHaveBeenCalledWith(9, TOURNAMENT_UPDATED, { id: 9, reason: 'team_locked' });

            const unlockRt = mockRealtime();
            await new UnlockTeamCommand(
                mockRepo({ findOne: jest.fn().mockResolvedValue(teamFixture({ status: TeamStatus.LOCKED })) }),
                mockPermissions(),
                unlockRt,
            ).execute(5, CAPTAIN);
            expect(unlockRt.toTeam).toHaveBeenCalledWith(5, TEAM_UPDATED, { id: 5, reason: 'team_unlocked' });
            expect(unlockRt.toTournament).toHaveBeenCalledWith(9, TOURNAMENT_UPDATED, { id: 9, reason: 'team_unlocked' });
        });

        it('lock: publishes nothing when the tournament is full', async () => {
            const realtime = mockRealtime();
            const full = teamFixture({
                members: [{ id: CAPTAIN }, { id: 2 }],
                tournament: { id: 9, status: TournamentStatus.REGISTRATION_OPEN, max_participants: 4, phases: [{ order: 1, game: { teamSize: 2 } }] },
            });
            const command = new LockTeamCommand(
                mockRepo({ findOne: jest.fn().mockResolvedValue(full), count: jest.fn().mockResolvedValue(4) }),
                mockPermissions(),
                realtime,
            );

            await expect(command.execute(5, CAPTAIN)).rejects.toThrow();

            expect(realtime.toTeam).not.toHaveBeenCalled();
            expect(realtime.toTournament).not.toHaveBeenCalled();
        });

        it('leave: tells the team, evicts the leaver, and updates the tournament when a locked team reverted', async () => {
            const realtime = mockRealtime();
            const team = teamFixture({ status: TeamStatus.LOCKED, members: [{ id: CAPTAIN }, { id: USER }] });
            const ctx = mockDataSource();
            ctx.manager.findOne.mockResolvedValue(team);

            await new LeaveTeamCommand(ctx.dataSource, realtime).execute(5, USER);

            expect(realtime.toTeam).toHaveBeenCalledWith(5, TEAM_UPDATED, { id: 5, reason: 'member_left' });
            expect(realtime.leaveTeamRoom).toHaveBeenCalledWith(USER, 5);
            expect(realtime.toTournament).toHaveBeenCalledWith(9, TOURNAMENT_UPDATED, { id: 9, reason: 'team_unlocked' });
        });

        it('leave: a DRAFT team leaves the tournament alone', async () => {
            const realtime = mockRealtime();
            const ctx = mockDataSource();
            ctx.manager.findOne.mockResolvedValue(teamFixture({ members: [{ id: CAPTAIN }, { id: USER }] }));

            await new LeaveTeamCommand(ctx.dataSource, realtime).execute(5, USER);

            expect(realtime.toTournament).not.toHaveBeenCalled();
        });

        it('delete: tells the team and the tournament', async () => {
            const realtime = mockRealtime();
            const ctx = mockDataSource();
            ctx.manager.findOne.mockResolvedValue(teamFixture());

            await new DeleteTeamCommand(ctx.dataSource, realtime).execute(5, CAPTAIN);

            expect(realtime.toTeam).toHaveBeenCalledWith(5, TEAM_UPDATED, { id: 5, reason: 'team_deleted' });
            expect(realtime.toTournament).toHaveBeenCalledWith(9, TOURNAMENT_UPDATED, { id: 9, reason: 'team_deleted' });
        });

        it('create: tells the tournament', async () => {
            const realtime = mockRealtime();
            const tournament = { id: 9, status: TournamentStatus.REGISTRATION_OPEN };
            const qb = mockQueryBuilder({ one: null, exists: false });
            const teamRepo = mockRepo({ createQueryBuilder: jest.fn().mockReturnValue(qb), save: jest.fn(async (x) => ({ ...x, id: 5 })) });
            const ctx = mockDataSource();

            await new CreateTeamCommand(
                teamRepo, mockRepo({ findOneBy: jest.fn().mockResolvedValue(tournament) }), ctx.dataSource, realtime,
            ).execute({ name: 'Blues', tournament_id: 9 } as any, { id: CAPTAIN } as any);

            expect(realtime.toTournament).toHaveBeenCalledWith(9, TOURNAMENT_UPDATED, { id: 9, reason: 'team_created' });
        });
    });

    describe('join requests and codes', () => {
        it('request: tells the captain and every admin individually', async () => {
            const realtime = mockRealtime();
            const permissions = mockPermissions();
            permissions.listAdminIds.mockResolvedValue([2, 3]);
            const command = new CreateJoinRequestCommand(
                mockRepo({ findOne: jest.fn().mockResolvedValue(teamFixture()) }),
                mockRepo({ findOne: jest.fn().mockResolvedValue(null), save: jest.fn(async (x) => ({ ...x, id: 44 })) }),
                mockNotifications(),
                permissions,
                realtime,
            );

            await command.execute(5, USER, 'hi');

            const targets = realtime.toUser.mock.calls.map((c: any[]) => c[0]);
            expect(targets).toEqual([CAPTAIN, 2, 3]);
            expect(realtime.toUser).toHaveBeenCalledWith(CAPTAIN, INVITATION_RECEIVED, { id: 44, reason: 'join_request' });
        });

        it('accept request: tells the team, the requester and the tournament', async () => {
            const realtime = mockRealtime();
            const request = { id: 11, sender_id: USER, status: InvitationStatus.PENDING, team: teamFixture() };
            const ctx = mockDataSource();
            ctx.manager.findOne.mockResolvedValue(request);
            ctx.manager.findOneBy.mockResolvedValue({ id: USER, username: 'neo' });
            ctx.manager.createQueryBuilder.mockReturnValue(mockQueryBuilder({ many: [] }));

            await new AcceptJoinRequestCommand(
                ctx.dataSource, mockNotifications(), mockPermissions(), new TeamMembershipService(), realtime,
            ).execute(11, CAPTAIN);

            expect(realtime.toTeam).toHaveBeenCalledWith(5, TEAM_UPDATED, { id: 5, reason: 'member_joined' });
            expect(realtime.toUser).toHaveBeenCalledWith(USER, INVITATION_RECEIVED, { id: 11, reason: 'request_accepted' });
            expect(realtime.toTournament).toHaveBeenCalledWith(9, TOURNAMENT_UPDATED, { id: 9, reason: 'looking_for_team_changed' });
        });

        it('decline request: tells the requester and the team', async () => {
            const realtime = mockRealtime();
            const request = { id: 11, team_id: 5, sender_id: USER, status: InvitationStatus.PENDING };

            await new DeclineJoinRequestCommand(
                mockRepo({ findOne: jest.fn().mockResolvedValue(request) }),
                mockRepo({ findOneBy: jest.fn().mockResolvedValue(teamFixture()) }),
                mockNotifications(),
                mockPermissions(),
                realtime,
            ).execute(11, CAPTAIN);

            expect(realtime.toUser).toHaveBeenCalledWith(USER, INVITATION_RECEIVED, { id: 11, reason: 'request_declined' });
            expect(realtime.toTeam).toHaveBeenCalledWith(5, TEAM_UPDATED, { id: 5, reason: 'request_declined' });
        });

        it('join by code: tells the team and the tournament, with no personal event', async () => {
            const realtime = mockRealtime();
            const ctx = mockDataSource();
            ctx.manager.createQueryBuilder
                .mockReturnValueOnce(mockQueryBuilder({ one: teamFixture() }))
                .mockReturnValue(mockQueryBuilder({ many: [] }));
            ctx.manager.findOneBy.mockResolvedValue({ id: USER });

            await new JoinByCodeCommand(ctx.dataSource, new TeamMembershipService(), realtime).execute('code', USER);

            expect(realtime.toTeam).toHaveBeenCalledWith(5, TEAM_UPDATED, { id: 5, reason: 'member_joined' });
            expect(realtime.toTournament).toHaveBeenCalledWith(9, TOURNAMENT_UPDATED, { id: 9, reason: 'looking_for_team_changed' });
            expect(realtime.toUser).not.toHaveBeenCalled();
        });
    });

    describe('looking-for-team board', () => {
        function build() {
            const realtime = mockRealtime();
            const command = new LookingForTeamCommand(
                mockRepo({ findOneBy: jest.fn().mockResolvedValue(null) }),
                mockRepo({ existsBy: jest.fn().mockResolvedValue(false) }),
                mockRepo({ findOneBy: jest.fn().mockResolvedValue({ id: 9, status: TournamentStatus.REGISTRATION_OPEN }) }),
                realtime,
            );
            return { realtime, command };
        }

        it('flag and unflag both tell the tournament', async () => {
            const { realtime, command } = build();

            await command.flag(9, USER, 'support main');
            await command.unflag(9, USER);

            expect(realtime.toTournament).toHaveBeenCalledTimes(2);
            expect(realtime.toTournament).toHaveBeenCalledWith(9, TOURNAMENT_UPDATED, { id: 9, reason: 'looking_for_team_changed' });
        });

        it('flag: publishes nothing when the tournament is closed', async () => {
            const realtime = mockRealtime();
            const command = new LookingForTeamCommand(
                mockRepo(), mockRepo(),
                mockRepo({ findOneBy: jest.fn().mockResolvedValue({ id: 9, status: TournamentStatus.ONGOING }) }),
                realtime,
            );

            await expect(command.flag(9, USER)).rejects.toThrow();

            expect(realtime.toTournament).not.toHaveBeenCalled();
        });
    });
});
