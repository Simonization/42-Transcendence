import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { LeaveTeamCommand } from './leave-team.command';
import { TeamStatus } from '../entities/team.entity';
import { TeamAdmin } from '../entities/team-admin.entity';
import { TournamentStatus } from '../../tournaments/entities/tournament.entity';
import { mockDataSource, mockRealtime } from '../testing/test-mocks-spec';

describe('LeaveTeamCommand', () => {
    const CAPTAIN = 1;
    const PLAYER = 2;

    function build(team: any) {
        const ctx = mockDataSource();
        ctx.manager.findOne.mockResolvedValue(team);
        return { ...ctx, command: new LeaveTeamCommand(ctx.dataSource, mockRealtime()) };
    }

    // Duo game: the two members are both starters.
    const team = (status: TeamStatus, tournamentStatus: TournamentStatus, over: any = {}) => ({
        id: 5,
        captain_id: CAPTAIN,
        status,
        checked_in_at: null as Date | null,
        members: [{ id: CAPTAIN }, { id: PLAYER }],
        tournament: { id: 9, status: tournamentStatus, phases: [{ order: 1, game: { teamSize: 2 } }], ...over },
    });

    it('removes the member and deletes their team_admins row', async () => {
        const { command, manager, runner } = build(team(TeamStatus.DRAFT, TournamentStatus.REGISTRATION_OPEN));

        await command.execute(5, PLAYER);

        expect(manager.delete).toHaveBeenCalledWith(TeamAdmin, { teamId: 5, userId: PLAYER });
        const saved = manager.save.mock.calls[0][0];
        expect(saved.members.map((m: any) => m.id)).toEqual([CAPTAIN]);
        expect(runner.commitTransaction).toHaveBeenCalled();
    });

    it('lets a member leave a LOCKED team while registration is open, and reverts it to DRAFT', async () => {
        const { command, manager } = build(team(TeamStatus.LOCKED, TournamentStatus.REGISTRATION_OPEN));

        await command.execute(5, PLAYER);

        expect(manager.save.mock.calls[0][0].status).toBe(TeamStatus.DRAFT);
    });

    it('keeps a LOCKED team LOCKED (and checked in) when a substitute leaves', async () => {
        const locked = { ...team(TeamStatus.LOCKED, TournamentStatus.REGISTRATION_OPEN), checked_in_at: new Date() };
        locked.members = [{ id: CAPTAIN }, { id: 3 }, { id: PLAYER }];
        const { command, manager } = build(locked);

        await command.execute(5, PLAYER);

        expect(manager.save.mock.calls[0][0]).toMatchObject({ status: TeamStatus.LOCKED });
        expect(manager.save.mock.calls[0][0].checked_in_at).not.toBeNull();
    });

    it('refuses (403) a leave that would drop a LOCKED team below its size after the deadline', async () => {
        const closed = team(TeamStatus.LOCKED, TournamentStatus.REGISTRATION_OPEN, { registration_closes_at: new Date(Date.now() - 60_000) });
        const { command, manager, runner } = build(closed);

        const err = await command.execute(5, PLAYER).catch((e) => e);

        expect(err).toBeInstanceOf(ForbiddenException);
        expect(err.getResponse()).toMatchObject({ error: 'LEAVE_LOCKED_AFTER_DEADLINE' });
        expect(manager.save).not.toHaveBeenCalled();
        expect(runner.rollbackTransaction).toHaveBeenCalled();
    });

    it.each([TournamentStatus.ONGOING, TournamentStatus.COMPLETED])(
        'refuses to leave a LOCKED team once the tournament is %s',
        async (status) => {
            const { command, runner } = build(team(TeamStatus.LOCKED, status));

            await expect(command.execute(5, PLAYER)).rejects.toBeInstanceOf(ForbiddenException);
            expect(runner.rollbackTransaction).toHaveBeenCalled();
            expect(runner.commitTransaction).not.toHaveBeenCalled();
        },
    );

    it('refuses to let the captain leave', async () => {
        const { command } = build(team(TeamStatus.DRAFT, TournamentStatus.REGISTRATION_OPEN));
        await expect(command.execute(5, CAPTAIN)).rejects.toThrow(/transfer captaincy or delete/);
    });

    it('rejects someone who is not on the roster', async () => {
        const { command } = build(team(TeamStatus.DRAFT, TournamentStatus.REGISTRATION_OPEN));
        await expect(command.execute(5, 99)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects an unknown team and always releases the runner', async () => {
        const { command, runner } = build(null);
        await expect(command.execute(5, PLAYER)).rejects.toBeInstanceOf(NotFoundException);
        expect(runner.release).toHaveBeenCalled();
    });
});
