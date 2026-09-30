import { BadRequestException } from '@nestjs/common';
import { CreateTeamCommand } from './create-team.command';
import { LockTeamCommand } from './lock-team.command';
import { UnlockTeamCommand } from './unlock-team.command';
import { JoinByCodeCommand } from './join-by-code.command';
import { CreateJoinRequestCommand } from './create-join-request.command';
import { AcceptJoinRequestCommand } from './accept-join-request.command';
import { AcceptInvitationCommand } from './accept-invitation.command';
import { LookingForTeamCommand } from './looking-for-team.command';
import { GetTournamentAvailabilityQuery } from '../queries/get-tournament-availability.query';
import { TeamMembershipService } from '../services/team-membership.service';
import { TeamStatus } from '../entities/team.entity';
import { InvitationDirection, InvitationStatus } from '../entities/team-invitation.entity';
import { TournamentStatus } from '../../tournaments/entities/tournament.entity';
import {
    mockDataSource, mockNotifications, mockPermissions, mockQueryBuilder, mockRealtime, mockRepo,
} from '../testing/test-mocks-spec';

/**
 * Every registration path goes through the same "is registration open" helper, so a deadline in
 * the past must refuse each of them even though the status is still REGISTRATION_OPEN.
 */
describe('registration deadline', () => {
    const USER = 7;
    const past = new Date(Date.now() - 60_000);
    const future = new Date(Date.now() + 3_600_000);

    const tournament = (closesAt: Date | null) => ({
        id: 9,
        status: TournamentStatus.REGISTRATION_OPEN,
        registration_closes_at: closesAt,
        max_participants: null,
        phases: [{ order: 1, game: { teamSize: 2 } }],
    });
    const team = (closesAt: Date | null, over: any = {}) => ({
        id: 5, name: 'Blues', status: TeamStatus.DRAFT, captain_id: 1, members: [{ id: 1 }, { id: 2 }],
        tournament: tournament(closesAt), ...over,
    });

    const closedMessage = /not open for registration/;

    it.each([[past, false], [future, true], [null, true]])('create team (deadline %s -> allowed %s)', async (closesAt, allowed) => {
        const teamRepo = mockRepo();
        teamRepo.createQueryBuilder
            .mockReturnValueOnce(mockQueryBuilder({ one: null }))
            .mockReturnValue(mockQueryBuilder({ exists: false }));
        const tournamentRepo = mockRepo({ findOneBy: jest.fn().mockResolvedValue(tournament(closesAt)) });
        const command = new CreateTeamCommand(teamRepo, tournamentRepo, mockDataSource().dataSource, mockRealtime());
        const run = command.execute({ name: 'Reds', tournament_id: 9 }, { id: USER } as any);
        if (allowed) await expect(run).resolves.toBeDefined();
        else await expect(run).rejects.toThrow(closedMessage);
    });

    it.each([[past, false], [future, true]])('lock team (deadline %s -> allowed %s)', async (closesAt, allowed) => {
        const teamRepo = mockRepo({ findOne: jest.fn().mockResolvedValue(team(closesAt)), count: jest.fn() });
        const command = new LockTeamCommand(teamRepo, mockPermissions(), mockRealtime());
        const run = command.execute(5, 1);
        if (allowed) await expect(run).resolves.toBeDefined();
        else {
            await expect(run).rejects.toBeInstanceOf(BadRequestException);
            expect(teamRepo.save).not.toHaveBeenCalled();
        }
    });

    it('unlock is refused after the deadline', async () => {
        const teamRepo = mockRepo({ findOne: jest.fn().mockResolvedValue(team(past, { status: TeamStatus.LOCKED })) });
        const command = new UnlockTeamCommand(teamRepo, mockPermissions(), mockRealtime());
        await expect(command.execute(5, 1)).rejects.toThrow(/registration has closed/);
    });

    it('unlock clears the check-in', async () => {
        const locked = team(future, { status: TeamStatus.LOCKED, checked_in_at: new Date() });
        const teamRepo = mockRepo({ findOne: jest.fn().mockResolvedValue(locked) });
        await new UnlockTeamCommand(teamRepo, mockPermissions(), mockRealtime()).execute(5, 1);
        expect(teamRepo.save.mock.calls[0][0]).toMatchObject({ status: TeamStatus.DRAFT, checked_in_at: null });
    });

    it('join by code is refused after the deadline', async () => {
        const ctx = mockDataSource();
        ctx.manager.createQueryBuilder.mockReturnValueOnce(
            mockQueryBuilder({ one: team(past, { members: [{ id: 1 }], join_code: 'abc' }) }),
        );
        const command = new JoinByCodeCommand(ctx.dataSource, new TeamMembershipService(), mockRealtime());
        await expect(command.execute('abc', USER)).rejects.toThrow(closedMessage);
        expect(ctx.runner.rollbackTransaction).toHaveBeenCalled();
    });

    it('join request is refused after the deadline', async () => {
        const teamRepo = mockRepo({ findOne: jest.fn().mockResolvedValue(team(past, { members: [{ id: 1 }] })) });
        const command = new CreateJoinRequestCommand(
            teamRepo, mockRepo(), mockNotifications(), mockPermissions(), mockRealtime(),
        );
        await expect(command.execute(5, USER)).rejects.toThrow(closedMessage);
    });

    it('accepting an invitation is refused after the deadline', async () => {
        const invite = {
            id: 11, sender_id: 1, receiver_id: USER, status: InvitationStatus.PENDING,
            team: team(past, { members: [{ id: 1 }] }),
        };
        const ctx = mockDataSource();
        ctx.manager.findOne.mockResolvedValue(invite);
        const command = new AcceptInvitationCommand(
            ctx.dataSource, mockRepo(), mockNotifications(), new TeamMembershipService(), mockRealtime(),
        );
        await expect(command.execute(11, USER)).rejects.toThrow(closedMessage);
        expect(invite.team.members).toHaveLength(1);
        expect(ctx.runner.commitTransaction).not.toHaveBeenCalled();
    });

    it('accepting a join request is refused after the deadline', async () => {
        const request = {
            id: 11, sender_id: USER, status: InvitationStatus.PENDING, direction: InvitationDirection.REQUEST,
            team: team(past, { members: [{ id: 1 }] }),
        };
        const ctx = mockDataSource();
        ctx.manager.findOne.mockResolvedValue(request);
        const command = new AcceptJoinRequestCommand(
            ctx.dataSource, mockNotifications(), mockPermissions(), new TeamMembershipService(), mockRealtime(),
        );
        await expect(command.execute(11, 1)).rejects.toThrow(closedMessage);
        expect(request.team.members).toHaveLength(1);
    });

    it('flagging as looking-for-team is refused after the deadline', async () => {
        const tournamentRepo = mockRepo({ findOneBy: jest.fn().mockResolvedValue(tournament(past)) });
        const command = new LookingForTeamCommand(mockRepo(), mockRepo(), tournamentRepo, mockRealtime());
        await expect(command.flag(9, USER)).rejects.toThrow(closedMessage);
    });

    it('availability reports registration as closed after the deadline and exposes the dates', async () => {
        const teamRepo = mockRepo({ count: jest.fn().mockResolvedValue(1) });
        const query = new GetTournamentAvailabilityQuery(teamRepo, mockRepo());
        const t: any = { ...tournament(past), checkin_opens_at: null };
        await expect(query.compute(t)).resolves.toMatchObject({
            registrationOpen: false, registrationClosesAt: past, checkinState: 'off',
        });
        await expect(query.compute({ ...t, registration_closes_at: future })).resolves.toMatchObject({ registrationOpen: true });
    });
});
