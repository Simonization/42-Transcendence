import { BadRequestException } from '@nestjs/common';
import { InvitePlayerCommand } from './invite-player.command';
import { TeamStatus } from '../entities/team.entity';
import { mockNotifications, mockPermissions, mockRealtime, mockRepo } from '../testing/test-mocks-spec';

describe('InvitePlayerCommand roster cap', () => {
    const teamFixture = (memberCount: number) => ({
        id: 5,
        name: 'Blues',
        status: TeamStatus.DRAFT,
        captain_id: 1,
        members: Array.from({ length: memberCount }, (_, i) => ({ id: i + 1 })),
        tournament: { id: 9, phases: [{ order: 1, game: { teamSize: 2 } }] },
    });

    function build(memberCount: number) {
        const inviteRepo = mockRepo({
            findOne: jest.fn().mockResolvedValue(null),
            save: jest.fn(async (x) => ({ ...x, id: 33 })),
        });
        const command = new InvitePlayerCommand(
            mockRepo({ findOne: jest.fn().mockResolvedValue(teamFixture(memberCount)) }),
            inviteRepo,
            mockRepo({ findOne: jest.fn().mockResolvedValue({ id: 1, username: 'cap' }) }),
            mockNotifications(),
            mockPermissions(),
            mockRealtime(),
        );
        return { command, inviteRepo };
    }

    it('invites past teamSize: the extra players become substitutes', async () => {
        for (const members of [1, 2, 3]) {
            const { command, inviteRepo } = build(members);
            await command.execute(5, 99, 1);
            expect(inviteRepo.save).toHaveBeenCalled();
        }
    });

    it('refuses once the team holds teamSize + 2 members', async () => {
        const { command, inviteRepo } = build(4);
        await expect(command.execute(5, 99, 1)).rejects.toBeInstanceOf(BadRequestException);
        await expect(command.execute(5, 99, 1)).rejects.toThrow(/already full/);
        expect(inviteRepo.save).not.toHaveBeenCalled();
    });
});
