import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { KickPlayerCommand } from './kick-player.command';
import { TeamStatus } from '../entities/team.entity';
import { mockNotifications, mockPermissions, mockRepo } from '../testing/test-mocks-spec';

describe('KickPlayerCommand', () => {
    const CAPTAIN = 1;
    const ADMIN = 2;
    const PLAYER = 3;

    function build(opts: { status?: TeamStatus; targetIsAdmin?: boolean; allow?: boolean } = {}) {
        const team = {
            id: 5,
            name: 'Reds',
            captain_id: CAPTAIN,
            status: opts.status ?? TeamStatus.DRAFT,
            members: [{ id: CAPTAIN }, { id: ADMIN }, { id: PLAYER }],
        };
        const teamRepo = mockRepo({ findOne: jest.fn().mockResolvedValue(team) });
        const adminRepo = mockRepo({ existsBy: jest.fn().mockResolvedValue(opts.targetIsAdmin ?? false) });
        const notifications = mockNotifications();
        const command = new KickPlayerCommand(teamRepo, adminRepo, mockPermissions(opts.allow ?? true), notifications);
        return { command, teamRepo, adminRepo, notifications };
    }

    it('deletes the kicked member\'s team_admins row and removes them from the roster', async () => {
        const { command, adminRepo, teamRepo } = build();

        await command.execute(5, PLAYER, CAPTAIN);

        expect(adminRepo.delete).toHaveBeenCalledWith({ teamId: 5, userId: PLAYER });
        expect(teamRepo.save.mock.calls[0][0].members.map((m: any) => m.id)).toEqual([CAPTAIN, ADMIN]);
    });

    it('lets the captain kick an admin (and drops their admin row)', async () => {
        const { command, adminRepo } = build({ targetIsAdmin: true });

        await command.execute(5, ADMIN, CAPTAIN);

        expect(adminRepo.delete).toHaveBeenCalledWith({ teamId: 5, userId: ADMIN });
    });

    it('stops an admin kicking another admin', async () => {
        const { command } = build({ targetIsAdmin: true });
        await expect(command.execute(5, ADMIN, 99)).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('refuses to kick the captain, or from a locked team', async () => {
        await expect(build().command.execute(5, CAPTAIN, ADMIN)).rejects.toBeInstanceOf(ForbiddenException);
        await expect(build({ status: TeamStatus.LOCKED }).command.execute(5, PLAYER, CAPTAIN))
            .rejects.toBeInstanceOf(BadRequestException);
    });

    it('requires captain/admin rights', async () => {
        const { command } = build({ allow: false });
        await expect(command.execute(5, PLAYER, 99)).rejects.toBeInstanceOf(ForbiddenException);
    });
});
