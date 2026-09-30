import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { LockTeamCommand } from './lock-team.command';
import { TeamStatus } from '../entities/team.entity';
import { TournamentStatus } from '../../tournaments/entities/tournament.entity';
import { mockPermissions, mockRealtime, mockRepo } from '../testing/test-mocks-spec';

describe('LockTeamCommand', () => {
    function build(opts: {
        status?: TournamentStatus;
        max?: number | null;
        locked?: number;
        members?: number;
        allow?: boolean;
    } = {}) {
        const team = {
            id: 5,
            captain_id: 1,
            status: TeamStatus.DRAFT,
            members: Array.from({ length: opts.members ?? 2 }, (_, i) => ({ id: i + 1 })),
            tournament: {
                id: 9,
                status: opts.status ?? TournamentStatus.REGISTRATION_OPEN,
                max_participants: opts.max === undefined ? 4 : opts.max,
                phases: [{ order: 1, game: { teamSize: 2 } }],
            },
        };
        const teamRepo = mockRepo({
            findOne: jest.fn().mockResolvedValue(team),
            count: jest.fn().mockResolvedValue(opts.locked ?? 0),
        });
        return { team, teamRepo, command: new LockTeamCommand(teamRepo, mockPermissions(opts.allow ?? true), mockRealtime()) };
    }

    it('locks a full team while registration is open and spots remain', async () => {
        const { command, teamRepo } = build({ locked: 3, max: 4 });

        await command.execute(5, 1);

        expect(teamRepo.save.mock.calls[0][0].status).toBe(TeamStatus.LOCKED);
    });

    it('refuses when the tournament already has max_participants LOCKED teams (409)', async () => {
        const { command, teamRepo } = build({ locked: 4, max: 4 });

        await expect(command.execute(5, 1)).rejects.toBeInstanceOf(ConflictException);
        await expect(command.execute(5, 1)).rejects.toThrow(/full/);
        expect(teamRepo.save).not.toHaveBeenCalled();
    });

    it('counts only LOCKED teams, in this tournament', async () => {
        const { command, teamRepo } = build();
        await command.execute(5, 1);
        expect(teamRepo.count).toHaveBeenCalledWith({
            where: { tournament: { id: 9 }, status: TeamStatus.LOCKED },
        });
    });

    it('has no cap when max_participants is null', async () => {
        const { command, teamRepo } = build({ max: null, locked: 500 });
        await command.execute(5, 1);
        expect(teamRepo.count).not.toHaveBeenCalled();
        expect(teamRepo.save).toHaveBeenCalled();
    });

    it.each([TournamentStatus.DRAFT, TournamentStatus.ONGOING, TournamentStatus.COMPLETED])(
        'refuses to lock when the tournament is %s',
        async (status) => {
            const { command } = build({ status });
            await expect(command.execute(5, 1)).rejects.toBeInstanceOf(BadRequestException);
        },
    );

    it('requires at least teamSize players and admin rights', async () => {
        await expect(build({ members: 1 }).command.execute(5, 1)).rejects.toThrow(/at least 2 players/);
        await expect(build({ allow: false }).command.execute(5, 99)).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('locks a team that carries one or two substitutes (teamSize + 2 at most)', async () => {
        for (const members of [3, 4]) {
            const { command, teamRepo } = build({ members });
            await command.execute(5, 1);
            expect(teamRepo.save.mock.calls[0][0].status).toBe(TeamStatus.LOCKED);
        }
    });

    it('refuses a roster beyond teamSize + 2', async () => {
        const { command, teamRepo } = build({ members: 5 });
        await expect(command.execute(5, 1)).rejects.toThrow(/at most 4 players/);
        expect(teamRepo.save).not.toHaveBeenCalled();
    });
});
