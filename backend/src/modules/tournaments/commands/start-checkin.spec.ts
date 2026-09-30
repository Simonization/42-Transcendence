import { BadRequestException } from '@nestjs/common';
import { StartTournamentCommand } from './start-tournament.command';
import { GetCheckinQuery } from '../queries/get-checkin.query';
import { GetSeedingQuery } from '../queries/get-seeding.query';
import { Team, TeamStatus } from '../../teams/entities/team.entity';
import { Tournament, TournamentStatus } from '../entities/tournament.entity';

/** The check-in filter: the same entrants at start, in the seeding preview and in the check-in list. */
describe('start with check-in', () => {
    const past = new Date(Date.now() - 60_000);
    const future = new Date(Date.now() + 3_600_000);
    const stamp = new Date();

    const team = (id: number, status: TeamStatus, checkedIn = false) => ({
        id, name: `T${id}`, status, checked_in_at: checkedIn ? stamp : null, members: [],
    });
    const tournamentWith = (checkinOpensAt: Date | null, teams: any[]): any => ({
        id: 9,
        status: TournamentStatus.REGISTRATION_OPEN,
        max_participants: null,
        seed_order: null,
        checkin_opens_at: checkinOpensAt,
        phases: [{ id: 1, order: 1, type: 'SINGLE_ELIMINATION' }],
        teams,
    });

    const field = [
        team(1, TeamStatus.LOCKED, true),
        team(2, TeamStatus.LOCKED, false), // locked but absent
        team(3, TeamStatus.LOCKED, true),
        team(4, TeamStatus.DRAFT),
    ];

    function buildStart(tournament: any) {
        const manager: any = {
            findOne: jest.fn().mockResolvedValueOnce(tournament).mockResolvedValueOnce(tournament),
            update: jest.fn(),
        };
        const dataSource: any = { transaction: jest.fn((fn: any) => fn(manager)) };
        const engine: any = { startPhase: jest.fn() };
        const notifications: any = { sendNotification: jest.fn() };
        const notifier: any = { dispatch: jest.fn(), matchesReady: jest.fn() };
        dataSource.getRepository = jest.fn(() => ({ find: jest.fn().mockResolvedValue([]) }));
        const command = new StartTournamentCommand(dataSource, engine, notifications, notifier);
        return { command, manager, engine };
    }

    const archivedIds = (manager: any): number[] =>
        manager.update.mock.calls.filter((c: any[]) => c[0] === Team).flatMap((c: any[]) => c[1].id._value);

    it('starts with checked-in teams only and archives the absent locked team with the DRAFT one', async () => {
        const { command, manager, engine } = buildStart(tournamentWith(past, field));

        await command.execute(9);

        const entrants = engine.startPhase.mock.calls[0][3];
        expect(entrants.map((t: any) => t.id)).toEqual([1, 3]);
        expect(archivedIds(manager).sort()).toEqual([2, 4]);
        expect(manager.update).toHaveBeenCalledWith(Team, expect.anything(), { status: TeamStatus.ARCHIVED });
    });

    it('takes every LOCKED team when check-in is not configured', async () => {
        const { command, manager, engine } = buildStart(tournamentWith(null, field));

        await command.execute(9);

        expect(engine.startPhase.mock.calls[0][3].map((t: any) => t.id)).toEqual([1, 2, 3]);
        expect(archivedIds(manager)).toEqual([4]);
    });

    it('takes every LOCKED team when the window has not opened yet (nobody could check in)', async () => {
        const { command, engine } = buildStart(tournamentWith(future, field));

        await command.execute(9);

        expect(engine.startPhase.mock.calls[0][3].map((t: any) => t.id)).toEqual([1, 2, 3]);
    });

    it('needs two checked-in teams, not two locked ones', async () => {
        const { command, manager } = buildStart(
            tournamentWith(past, [team(1, TeamStatus.LOCKED, true), team(2, TeamStatus.LOCKED), team(3, TeamStatus.LOCKED)]),
        );

        await expect(command.execute(9)).rejects.toBeInstanceOf(BadRequestException);
        expect(manager.update).not.toHaveBeenCalled();
    });

    it('ignores a checked-in flag on a team that is no longer LOCKED', async () => {
        const stale = [team(1, TeamStatus.LOCKED, true), team(2, TeamStatus.LOCKED, true), team(3, TeamStatus.DRAFT, true)];
        const { command, engine } = buildStart(tournamentWith(past, stale));

        await command.execute(9);

        expect(engine.startPhase.mock.calls[0][3].map((t: any) => t.id)).toEqual([1, 2]);
    });

    describe('seeding preview', () => {
        const preview = (t: any) =>
            new GetSeedingQuery({ findOne: jest.fn().mockResolvedValue(t) } as any).execute(9);

        it('shows the same entrants as start, and why the others are out', async () => {
            const view = await preview(tournamentWith(past, field));

            expect(view.teams.map((t) => t.id)).toEqual([1, 3]);
            expect(view.excluded).toEqual([
                { id: 2, name: 'T2', status: 'LOCKED', reason: 'not_checked_in' },
                { id: 4, name: 'T4', status: 'DRAFT', reason: 'not_locked' },
            ]);
            expect(view.checkin).toMatchObject({ state: 'open', required: true });
        });

        it('keeps every locked team before the window opens', async () => {
            const view = await preview(tournamentWith(future, field));
            expect(view.teams.map((t) => t.id)).toEqual([1, 2, 3]);
            expect(view.checkin).toMatchObject({ state: 'upcoming', required: false });
        });

        it('reports the check-in as off, and does not filter, without a window', async () => {
            const view = await preview(tournamentWith(null, field));
            expect(view.teams.map((t) => t.id)).toEqual([1, 2, 3]);
            expect(view.checkin.state).toBe('off');
        });
    });

    describe('GET /tournaments/:id/checkin', () => {
        const query = (t: any) => new GetCheckinQuery({ findOne: jest.fn().mockResolvedValue(t) } as any);

        it('lists who checked in, who did not, and who start would archive', async () => {
            const view = await query(tournamentWith(past, field)).execute(9);

            expect(view.state).toBe('open');
            expect(view.required).toBe(true);
            expect(view.checkedIn.map((t) => t.id)).toEqual([1, 3]);
            expect(view.notCheckedIn.map((t) => t.id)).toEqual([2]);
            expect(view.willBeArchived).toEqual([
                { id: 4, name: 'T4', status: 'DRAFT', reason: 'not_locked' },
                { id: 2, name: 'T2', status: 'LOCKED', reason: 'not_checked_in' },
            ]);
        });

        it('does not list absent locked teams as archived before the window opens', async () => {
            const view = await query(tournamentWith(future, field)).execute(9);
            expect(view.state).toBe('upcoming');
            expect(view.willBeArchived.map((t) => t.id)).toEqual([4]);
        });

        it('lists nothing to archive once the tournament has started', async () => {
            const t = tournamentWith(past, field) as Tournament;
            t.status = TournamentStatus.ONGOING;
            const view = await query(t).execute(9);
            expect(view.state).toBe('closed');
            expect(view.willBeArchived).toEqual([]);
        });
    });
});
