import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { JoinByCodeCommand } from './join-by-code.command';
import { JoinCodeCommand } from './join-code.command';
import { CreateJoinRequestCommand } from './create-join-request.command';
import { AcceptJoinRequestCommand } from './accept-join-request.command';
import { DeclineJoinRequestCommand } from './decline-join-request.command';
import { LookingForTeamCommand } from './looking-for-team.command';
import { TeamMembershipService } from '../services/team-membership.service';
import { TeamStatus } from '../entities/team.entity';
import { InvitationDirection, InvitationStatus } from '../entities/team-invitation.entity';
import { LookingForTeam } from '../entities/looking-for-team.entity';
import { TournamentStatus } from '../../tournaments/entities/tournament.entity';
import {
    mockDataSource, mockNotifications, mockPermissions, mockQueryBuilder, mockRepo,
} from '../testing/test-mocks-spec';

const USER = 7;

const teamFixture = (over: any = {}) => ({
    id: 5,
    name: 'Blues',
    status: TeamStatus.DRAFT,
    captain_id: 1,
    join_code: 'abcDEF2345',
    members: [{ id: 1 }],
    tournament: {
        id: 9,
        status: TournamentStatus.REGISTRATION_OPEN,
        phases: [{ order: 1, game: { teamSize: 2 } }],
    },
    ...over,
});

describe('JoinByCodeCommand', () => {
    function build(opts: { team?: any; otherTeams?: any[] } = {}) {
        const team = opts.team === undefined ? teamFixture() : opts.team;
        const ctx = mockDataSource();
        // First builder: lookup by code; second: "other teams" inside the membership check.
        ctx.manager.createQueryBuilder
            .mockReturnValueOnce(mockQueryBuilder({ one: team }))
            .mockReturnValue(mockQueryBuilder({ many: opts.otherTeams ?? [] }));
        ctx.manager.findOneBy.mockResolvedValue({ id: USER, username: 'neo' });
        return { ...ctx, team, command: new JoinByCodeCommand(ctx.dataSource, new TeamMembershipService()) };
    }

    it('joins a DRAFT, non-full team of an open tournament and clears the LFT flag', async () => {
        const { command, team, manager, runner } = build();

        await expect(command.execute('abcDEF2345', USER)).resolves.toEqual({ message: expect.any(String), teamId: 5, tournamentId: 9 });

        expect(team.members.map((m: any) => m.id)).toEqual([1, USER]);
        expect(manager.delete).toHaveBeenCalledWith(LookingForTeam, { userId: USER, tournamentId: 9 });
        expect(runner.commitTransaction).toHaveBeenCalled();
    });

    it('404s on an unknown code', async () => {
        await expect(build({ team: null }).command.execute('nope', USER)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('refuses a locked team, a closed tournament and a full team', async () => {
        await expect(build({ team: teamFixture({ status: TeamStatus.LOCKED }) }).command.execute('x', USER))
            .rejects.toBeInstanceOf(BadRequestException);
        const closed = teamFixture();
        closed.tournament.status = TournamentStatus.ONGOING;
        await expect(build({ team: closed }).command.execute('x', USER)).rejects.toBeInstanceOf(BadRequestException);
        await expect(build({ team: teamFixture({ members: [{ id: 1 }, { id: 2 }] }) }).command.execute('x', USER))
            .rejects.toThrow(/already full/);
    });

    it('refuses someone already locked into another team of this tournament (409) and rolls back', async () => {
        const locked = { id: 3, name: 'Locked FC', status: TeamStatus.LOCKED, captain_id: 100, members: [{ id: 100 }, { id: USER }] };
        const { command, runner, manager } = build({ otherTeams: [locked] });

        await expect(command.execute('abcDEF2345', USER)).rejects.toBeInstanceOf(ConflictException);

        expect(runner.rollbackTransaction).toHaveBeenCalled();
        expect(manager.save).not.toHaveBeenCalled();
    });
});

describe('JoinCodeCommand', () => {
    function build(team: any, allow = true) {
        const teamRepo = mockRepo();
        teamRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder({ one: team, exists: false }));
        return { teamRepo, command: new JoinCodeCommand(teamRepo, mockPermissions(allow)) };
    }

    it('shows the code to members only', async () => {
        const { command } = build(teamFixture({ members: [{ id: 1 }, { id: 2 }] }));
        await expect(command.get(5, 2)).resolves.toEqual({ joinCode: 'abcDEF2345' });
        await expect(command.get(5, 99)).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('lets captain/admins regenerate it (a new, different code) and blocks others', async () => {
        const { command, teamRepo } = build(teamFixture());

        const { joinCode } = await command.regenerate(5, 1);

        expect(joinCode).toMatch(/^[A-Za-z0-9]{10}$/);
        expect(joinCode).not.toBe('abcDEF2345');
        expect(teamRepo.update).toHaveBeenCalledWith(5, { join_code: joinCode });
        await expect(build(teamFixture(), false).command.regenerate(5, 3)).rejects.toBeInstanceOf(ForbiddenException);
    });
});

describe('join requests', () => {
    describe('CreateJoinRequestCommand', () => {
        function build(team: any, existing: any = null) {
            const teamRepo = mockRepo({ findOne: jest.fn().mockResolvedValue(team) });
            const inviteRepo = mockRepo({ findOne: jest.fn().mockResolvedValue(existing) });
            const permissions = mockPermissions();
            permissions.listAdminIds.mockResolvedValue([2]);
            const notifications = mockNotifications();
            return {
                inviteRepo, notifications,
                command: new CreateJoinRequestCommand(teamRepo, inviteRepo, notifications, permissions),
            };
        }

        it('stores a REQUEST from the user and notifies the captain and admins', async () => {
            const { command, inviteRepo, notifications } = build(teamFixture());

            await command.execute(5, USER, 'gold rank, main support');

            expect(inviteRepo.save.mock.calls[0][0]).toMatchObject({
                team_id: 5, sender_id: USER, receiver_id: 1,
                direction: InvitationDirection.REQUEST, status: InvitationStatus.PENDING, note: 'gold rank, main support',
            });
            expect(notifications.sendNotification).toHaveBeenCalledTimes(2);
        });

        it('refuses locked/full teams, existing members and duplicate requests', async () => {
            await expect(build(teamFixture({ status: TeamStatus.LOCKED })).command.execute(5, USER)).rejects.toBeInstanceOf(BadRequestException);
            await expect(build(teamFixture({ members: [{ id: 1 }, { id: 2 }] })).command.execute(5, USER)).rejects.toThrow(/full/);
            await expect(build(teamFixture()).command.execute(5, 1)).rejects.toThrow(/already a member/);
            await expect(build(teamFixture(), { id: 1 }).command.execute(5, USER)).rejects.toThrow(/already have a pending/);
        });
    });

    describe('AcceptJoinRequestCommand', () => {
        function build(opts: { allow?: boolean; otherTeams?: any[]; request?: any } = {}) {
            const request = opts.request === undefined
                ? {
                    id: 11, sender_id: USER, status: InvitationStatus.PENDING,
                    direction: InvitationDirection.REQUEST, team: teamFixture(),
                }
                : opts.request;
            const ctx = mockDataSource();
            ctx.manager.findOne.mockResolvedValue(request);
            ctx.manager.findOneBy.mockResolvedValue({ id: USER, username: 'neo' });
            ctx.manager.createQueryBuilder.mockReturnValue(mockQueryBuilder({ many: opts.otherTeams ?? [] }));
            const permissions = mockPermissions(opts.allow ?? true);
            const command = new AcceptJoinRequestCommand(ctx.dataSource, mockNotifications(), permissions, new TeamMembershipService());
            return { ...ctx, request, permissions, command };
        }

        it('lets a captain/admin add the requester to the team', async () => {
            const { command, request, permissions, manager } = build();

            await command.execute(11, 1);

            expect(permissions.assertAdmin).toHaveBeenCalledWith(5, 1, 1);
            expect(request.status).toBe(InvitationStatus.ACCEPTED);
            expect(request.team.members.map((m: any) => m.id)).toEqual([1, USER]);
            expect(manager.delete).toHaveBeenCalledWith(LookingForTeam, { userId: USER, tournamentId: 9 });
        });

        it('refuses non-admins, and rolls back', async () => {
            const { command, runner } = build({ allow: false });
            await expect(command.execute(11, 3)).rejects.toBeInstanceOf(ForbiddenException);
            expect(runner.rollbackTransaction).toHaveBeenCalled();
        });

        it('applies the one-team rule: 409 if the requester is locked elsewhere', async () => {
            const locked = { id: 3, name: 'Locked FC', status: TeamStatus.LOCKED, captain_id: 100, members: [{ id: 100 }, { id: USER }] };
            await expect(build({ otherTeams: [locked] }).command.execute(11, 1)).rejects.toBeInstanceOf(ConflictException);
        });

        it('404s on unknown requests', async () => {
            await expect(build({ request: null }).command.execute(11, 1)).rejects.toBeInstanceOf(NotFoundException);
        });
    });

    describe('DeclineJoinRequestCommand', () => {
        it('lets a captain/admin decline and notifies the requester', async () => {
            const request = { id: 11, team_id: 5, sender_id: USER, status: InvitationStatus.PENDING };
            const inviteRepo = mockRepo({ findOne: jest.fn().mockResolvedValue(request) });
            const teamRepo = mockRepo({ findOneBy: jest.fn().mockResolvedValue(teamFixture()) });
            const notifications = mockNotifications();
            const command = new DeclineJoinRequestCommand(inviteRepo, teamRepo, notifications, mockPermissions());

            await command.execute(11, 1);

            expect(request.status).toBe(InvitationStatus.DECLINED);
            expect(notifications.sendNotification).toHaveBeenCalledWith(
                USER, 'team_join_request_declined', expect.any(String), undefined, expect.any(Object), expect.anything(),
            );
        });
    });
});

describe('LookingForTeamCommand', () => {
    function build(opts: { tournament?: any; onTeam?: boolean; existing?: any } = {}) {
        const lftRepo = mockRepo({ findOneBy: jest.fn().mockResolvedValue(opts.existing ?? null) });
        const teamRepo = mockRepo({ existsBy: jest.fn().mockResolvedValue(opts.onTeam ?? false) });
        const tournamentRepo = mockRepo({
            findOneBy: jest.fn().mockResolvedValue(
                opts.tournament === undefined ? { id: 9, status: TournamentStatus.REGISTRATION_OPEN } : opts.tournament,
            ),
        });
        return { lftRepo, command: new LookingForTeamCommand(lftRepo, teamRepo, tournamentRepo) };
    }

    it('flags the user with an optional note', async () => {
        const { command, lftRepo } = build();
        await command.flag(9, USER, 'evenings CET');
        expect(lftRepo.save.mock.calls[0][0]).toMatchObject({ userId: USER, tournamentId: 9, note: 'evenings CET' });
    });

    it('updates the note instead of duplicating (unique per user + tournament)', async () => {
        const existing = { userId: USER, tournamentId: 9, note: 'old' };
        const { command, lftRepo } = build({ existing });
        await command.flag(9, USER, 'new');
        expect(existing.note).toBe('new');
        expect(lftRepo.create).not.toHaveBeenCalled();
    });

    it('refuses users who already have a team, and closed tournaments', async () => {
        await expect(build({ onTeam: true }).command.flag(9, USER)).rejects.toBeInstanceOf(BadRequestException);
        await expect(build({ tournament: { id: 9, status: TournamentStatus.ONGOING } }).command.flag(9, USER))
            .rejects.toBeInstanceOf(BadRequestException);
        await expect(build({ tournament: null }).command.flag(9, USER)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('unflag removes the row', async () => {
        const { command, lftRepo } = build();
        await command.unflag(9, USER);
        expect(lftRepo.delete).toHaveBeenCalledWith({ userId: USER, tournamentId: 9 });
    });
});
