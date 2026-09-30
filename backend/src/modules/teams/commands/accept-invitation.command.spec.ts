import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { AcceptInvitationCommand } from './accept-invitation.command';
import { TeamMembershipService } from '../services/team-membership.service';
import { TeamStatus } from '../entities/team.entity';
import { TeamAdmin } from '../entities/team-admin.entity';
import { InvitationStatus } from '../entities/team-invitation.entity';
import { LookingForTeam } from '../entities/looking-for-team.entity';
import { mockDataSource, mockNotifications, mockQueryBuilder, mockRealtime, mockRepo } from '../testing/test-mocks-spec';

describe('AcceptInvitationCommand', () => {
    const USER = 7;

    const teamFixture = (over: any = {}) => ({
        id: 5,
        name: 'Blues',
        status: TeamStatus.DRAFT,
        captain_id: 1,
        members: [{ id: 1 }],
        tournament: { id: 9, phases: [{ order: 1, game: { teamSize: 2 } }] },
        ...over,
    });

    function build(opts: { team?: any; otherTeams?: any[]; invite?: any } = {}) {
        const invite = opts.invite === undefined
            ? { id: 11, sender_id: 1, receiver_id: USER, status: InvitationStatus.PENDING, team: opts.team ?? teamFixture() }
            : opts.invite;
        const ctx = mockDataSource();
        ctx.manager.findOne.mockResolvedValue(invite);
        ctx.manager.findOneBy.mockResolvedValue({ id: USER, username: 'neo' });
        ctx.manager.createQueryBuilder.mockReturnValue(mockQueryBuilder({ many: opts.otherTeams ?? [] }));
        const notifications = mockNotifications();
        const command = new AcceptInvitationCommand(
            ctx.dataSource,
            mockRepo(),
            notifications,
            new TeamMembershipService(),
            mockRealtime(),
        );
        return { ...ctx, command, notifications, invite };
    }

    it('adds the user to the team, marks the invite accepted and clears their LFT flag', async () => {
        const { command, manager, invite, runner, notifications } = build();

        await expect(command.execute(11, USER)).resolves.toMatchObject({ teamId: 5 });

        expect(invite.status).toBe(InvitationStatus.ACCEPTED);
        expect(invite.team.members.map((m: any) => m.id)).toEqual([1, USER]);
        expect(manager.delete).toHaveBeenCalledWith(LookingForTeam, { userId: USER, tournamentId: 9 });
        expect(runner.commitTransaction).toHaveBeenCalled();
        expect(notifications.sendNotification).toHaveBeenCalled();
    });

    it('409s and changes nothing when the user is in a LOCKED team in this tournament', async () => {
        const locked = { id: 3, name: 'Locked FC', status: TeamStatus.LOCKED, captain_id: 100, members: [{ id: 100 }, { id: USER }] };
        const { command, manager, runner, invite } = build({ otherTeams: [locked] });

        await expect(command.execute(11, USER)).rejects.toBeInstanceOf(ConflictException);

        expect(invite.status).toBe(InvitationStatus.PENDING);
        expect(locked.members).toHaveLength(2);
        expect(manager.save).not.toHaveBeenCalled();
        expect(runner.rollbackTransaction).toHaveBeenCalled();
        expect(runner.commitTransaction).not.toHaveBeenCalled();
    });

    it('pulls the user out of another DRAFT team and deletes their admin row there', async () => {
        const draft = { id: 3, name: 'Draft FC', status: TeamStatus.DRAFT, captain_id: 100, members: [{ id: 100 }, { id: USER }] };
        const { command, manager } = build({ otherTeams: [draft] });

        await command.execute(11, USER);

        expect(manager.delete).toHaveBeenCalledWith(TeamAdmin, { teamId: 3, userId: USER });
        expect(draft.members.map((m: any) => m.id)).toEqual([100]);
    });

    it('refuses a locked or full target team', async () => {
        await expect(build({ team: teamFixture({ status: TeamStatus.LOCKED }) }).command.execute(11, USER))
            .rejects.toBeInstanceOf(BadRequestException);
        // teamSize 2 + 2 substitutes = 4 members is the ceiling.
        await expect(build({ team: teamFixture({ members: [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }] }) }).command.execute(11, USER))
            .rejects.toThrow(/already full/);
    });

    it('accepts an invitation as a substitute once the starters are in', async () => {
        const { command, invite } = build({ team: teamFixture({ members: [{ id: 1 }, { id: 2 }, { id: 3 }] }) });
        await command.execute(11, USER);
        expect(invite.team.members.map((m: any) => m.id)).toEqual([1, 2, 3, USER]);
    });

    it('404s on an unknown or already processed invitation', async () => {
        await expect(build({ invite: null }).command.execute(11, USER)).rejects.toBeInstanceOf(NotFoundException);
    });
});
