import { ForbiddenException } from '@nestjs/common';
import { DeleteTeamCommand } from './delete-team.command';
import { Team, TeamStatus } from '../entities/team.entity';
import { TournamentStatus } from '../../tournaments/entities/tournament.entity';
import { mockDataSource, mockRealtime } from '../testing/test-mocks-spec';

const CAPTAIN = 1;

function build(team: any, matches = 0) {
    const ctx = mockDataSource();
    ctx.manager.findOne.mockResolvedValue(team);
    ctx.manager.count.mockResolvedValue(matches);
    return { ...ctx, command: new DeleteTeamCommand(ctx.dataSource, mockRealtime()) };
}

const team = (status: TeamStatus, tournamentStatus: TournamentStatus) => ({
    id: 5,
    status,
    captain_id: CAPTAIN,
    members: [{ id: CAPTAIN }],
    tournament: { id: 9, status: tournamentStatus },
});

describe('DeleteTeamCommand', () => {
    it('deletes a DRAFT team while registration is open', async () => {
        const { command, manager } = build(team(TeamStatus.DRAFT, TournamentStatus.REGISTRATION_OPEN));
        await command.execute(5, CAPTAIN);
        expect(manager.delete).toHaveBeenCalledWith(Team, { id: 5 });
    });

    it('refuses once the tournament has started or finished, whatever the team status', async () => {
        for (const [status, tStatus] of [
            [TeamStatus.ARCHIVED, TournamentStatus.ONGOING],
            [TeamStatus.ARCHIVED, TournamentStatus.COMPLETED],
            [TeamStatus.DRAFT, TournamentStatus.ONGOING],
        ] as const) {
            const { command, manager, runner } = build(team(status, tStatus));
            await expect(command.execute(5, CAPTAIN)).rejects.toBeInstanceOf(ForbiddenException);
            expect(manager.delete).not.toHaveBeenCalledWith(Team, { id: 5 });
            expect(runner.rollbackTransaction).toHaveBeenCalled();
        }
    });

    it('refuses a team that appears in matches', async () => {
        const { command, manager } = build(team(TeamStatus.DRAFT, TournamentStatus.REGISTRATION_OPEN), 1);
        await expect(command.execute(5, CAPTAIN)).rejects.toThrow(/matches/);
        expect(manager.delete).not.toHaveBeenCalledWith(Team, { id: 5 });
    });
});
