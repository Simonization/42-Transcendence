import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { RenameTeamCommand } from './rename-team.command';
import { UnlockTeamCommand } from './unlock-team.command';
import { TransferCaptaincyCommand } from './transfer-captaincy.command';
import { CancelInvitationCommand } from './cancel-invitation.command';
import { TeamStatus } from '../entities/team.entity';
import { InvitationDirection, InvitationStatus } from '../entities/team-invitation.entity';
import { TournamentStatus } from '../../tournaments/entities/tournament.entity';
import { mockNotifications, mockPermissions, mockRepo } from '../testing/test-mocks-spec';

const teamFixture = (over: any = {}) => ({
    id: 5,
    name: 'Reds',
    captain_id: 1,
    status: TeamStatus.DRAFT,
    members: [{ id: 1 }, { id: 2 }, { id: 3 }],
    tournament: { id: 9, status: TournamentStatus.REGISTRATION_OPEN },
    ...over,
});

describe('RenameTeamCommand', () => {
    function build(team: any, allow = true) {
        const teamRepo = mockRepo({ findOne: jest.fn().mockResolvedValue(team) });
        return { teamRepo, command: new RenameTeamCommand(teamRepo, mockPermissions(allow)) };
    }

    it('renames for a captain/admin before the tournament starts', async () => {
        const { command, teamRepo } = build(teamFixture());
        await command.execute(5, 'Blues', 1);
        expect(teamRepo.save.mock.calls[0][0].name).toBe('Blues');
    });

    it.each([TournamentStatus.ONGOING, TournamentStatus.COMPLETED])('refuses once the tournament is %s', async (status) => {
        const { command } = build(teamFixture({ tournament: { id: 9, status } }));
        await expect(command.execute(5, 'Blues', 1)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('is guarded by the permission service and 404s on an unknown team', async () => {
        await expect(build(teamFixture(), false).command.execute(5, 'Blues', 2)).rejects.toBeInstanceOf(ForbiddenException);
        await expect(build(null).command.execute(5, 'Blues', 1)).rejects.toBeInstanceOf(NotFoundException);
    });
});

describe('UnlockTeamCommand', () => {
    function build(team: any, allow = true) {
        const teamRepo = mockRepo({ findOne: jest.fn().mockResolvedValue(team) });
        return { teamRepo, command: new UnlockTeamCommand(teamRepo, mockPermissions(allow)) };
    }

    it('takes a LOCKED team back to DRAFT while registration is open', async () => {
        const { command, teamRepo } = build(teamFixture({ status: TeamStatus.LOCKED }));
        await command.execute(5, 1);
        expect(teamRepo.save.mock.calls[0][0].status).toBe(TeamStatus.DRAFT);
    });

    it('refuses once registration has closed, or when the team is not locked', async () => {
        const started = teamFixture({ status: TeamStatus.LOCKED, tournament: { id: 9, status: TournamentStatus.ONGOING } });
        await expect(build(started).command.execute(5, 1)).rejects.toBeInstanceOf(BadRequestException);
        await expect(build(teamFixture()).command.execute(5, 1)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('requires captain/admin rights', async () => {
        const locked = teamFixture({ status: TeamStatus.LOCKED });
        await expect(build(locked, false).command.execute(5, 3)).rejects.toBeInstanceOf(ForbiddenException);
    });
});

describe('TransferCaptaincyCommand', () => {
    function build(team: any, existingAdminRows: number[] = []) {
        const teamRepo = mockRepo({ findOne: jest.fn().mockResolvedValue(team) });
        const adminRepo = mockRepo({
            existsBy: jest.fn(async ({ userId }) => existingAdminRows.includes(userId)),
        });
        const notifications = mockNotifications();
        return { teamRepo, adminRepo, notifications, command: new TransferCaptaincyCommand(teamRepo, adminRepo, notifications) };
    }

    it('makes the target captain and the old captain an admin', async () => {
        const { command, teamRepo, adminRepo, notifications } = build(teamFixture());

        await command.execute(5, 2, 1);

        expect(teamRepo.save.mock.calls[0][0].captain_id).toBe(2);
        expect(adminRepo.save).toHaveBeenCalledWith({ teamId: 5, userId: 1, grantedBy: 1 });
        // the new captain's own (now redundant) admin row is dropped
        expect(adminRepo.delete).toHaveBeenCalledWith({ teamId: 5, userId: 2 });
        expect(notifications.sendNotification).toHaveBeenCalledWith(
            2, 'team_captain_transferred', expect.any(String), undefined, expect.any(Object), expect.anything(),
        );
    });

    it('does not duplicate an admin row the old captain already has', async () => {
        const { command, adminRepo } = build(teamFixture(), [1]);
        await command.execute(5, 2, 1);
        expect(adminRepo.save).not.toHaveBeenCalled();
    });

    it('is captain-only', async () => {
        await expect(build(teamFixture()).command.execute(5, 3, 2)).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('needs a different, current member as target', async () => {
        await expect(build(teamFixture()).command.execute(5, 1, 1)).rejects.toBeInstanceOf(BadRequestException);
        await expect(build(teamFixture()).command.execute(5, 99, 1)).rejects.toBeInstanceOf(NotFoundException);
    });
});

describe('CancelInvitationCommand', () => {
    function build(invite: any, team: any = teamFixture(), allow = true) {
        const inviteRepo = mockRepo({ findOne: jest.fn().mockResolvedValue(invite) });
        const teamRepo = mockRepo({ findOneBy: jest.fn().mockResolvedValue(team) });
        const permissions = mockPermissions(allow);
        return { inviteRepo, permissions, command: new CancelInvitationCommand(inviteRepo, teamRepo, permissions) };
    }

    const invite = (over: any = {}) => ({
        id: 11, team_id: 5, sender_id: 1, receiver_id: 8,
        status: InvitationStatus.PENDING, direction: InvitationDirection.INVITE, ...over,
    });

    it('lets a team captain/admin cancel a pending invitation', async () => {
        const { command, inviteRepo, permissions } = build(invite());

        await command.execute(11, 1);

        expect(permissions.assertAdmin).toHaveBeenCalledWith(5, 1, 1);
        expect(inviteRepo.save.mock.calls[0][0].status).toBe(InvitationStatus.CANCELLED);
    });

    it('refuses non-admins', async () => {
        await expect(build(invite(), teamFixture(), false).command.execute(11, 3)).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('lets only the requester cancel their own join request', async () => {
        const request = invite({ direction: InvitationDirection.REQUEST, sender_id: 8, receiver_id: 1 });

        await build(request).command.execute(11, 8);
        await expect(build(request).command.execute(11, 1)).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('404s when the invitation is missing or no longer pending', async () => {
        await expect(build(null).command.execute(11, 1)).rejects.toBeInstanceOf(NotFoundException);
    });
});
