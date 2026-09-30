import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { CheckInTeamCommand } from './check-in-team.command';
import { TeamStatus } from '../entities/team.entity';
import { TournamentStatus } from '../../tournaments/entities/tournament.entity';
import { RealtimeEvents } from '../../realtime/realtime.events';
import { mockPermissions, mockRealtime, mockRepo } from '../testing/test-mocks-spec';

describe('CheckInTeamCommand', () => {
    const past = new Date(Date.now() - 60_000);
    const future = new Date(Date.now() + 3_600_000);

    function build(opts: {
        opensAt?: Date | null;
        status?: TournamentStatus;
        teamStatus?: TeamStatus;
        allow?: boolean;
        checkedInAt?: Date | null;
        noTeam?: boolean;
    } = {}) {
        const team: any = {
            id: 5,
            captain_id: 1,
            status: opts.teamStatus ?? TeamStatus.LOCKED,
            checked_in_at: opts.checkedInAt ?? null,
            tournament: {
                id: 9,
                status: opts.status ?? TournamentStatus.REGISTRATION_OPEN,
                checkin_opens_at: opts.opensAt === undefined ? past : opts.opensAt,
            },
        };
        const teamRepo = mockRepo({ findOne: jest.fn().mockResolvedValue(opts.noTeam ? null : team) });
        const permissions = mockPermissions(opts.allow ?? true);
        const realtime = mockRealtime();
        return { team, teamRepo, permissions, realtime, command: new CheckInTeamCommand(teamRepo, permissions, realtime) };
    }

    it('stamps checked_in_at for a locked team while the window is open, and publishes', async () => {
        const { command, teamRepo, realtime, permissions } = build();

        await command.execute(5, 1);

        expect(permissions.assertAdmin).toHaveBeenCalledWith(5, 1, 1);
        expect(teamRepo.save.mock.calls[0][0].checked_in_at).toBeInstanceOf(Date);
        expect(realtime.toTeam).toHaveBeenCalledWith(5, RealtimeEvents.TEAM_UPDATED, { id: 5, reason: 'team_checked_in' });
        expect(realtime.toTournament).toHaveBeenCalledWith(9, RealtimeEvents.TOURNAMENT_UPDATED, { id: 9, reason: 'team_checked_in' });
    });

    it('refuses someone who is neither captain nor team admin', async () => {
        const { command, teamRepo } = build({ allow: false });
        await expect(command.execute(5, 3)).rejects.toBeInstanceOf(ForbiddenException);
        expect(teamRepo.save).not.toHaveBeenCalled();
    });

    it('lets a global admin check any team in without team rights', async () => {
        const { command, teamRepo, permissions } = build({ allow: false });
        await command.execute(5, 99, true);
        expect(permissions.assertAdmin).not.toHaveBeenCalled();
        expect(teamRepo.save).toHaveBeenCalled();
    });

    it('refuses before the window opens, with no check-in configured, and after start', async () => {
        await expect(build({ opensAt: future }).command.execute(5, 1)).rejects.toThrow(/not opened yet/);
        await expect(build({ opensAt: null }).command.execute(5, 1)).rejects.toThrow(/no check-in/);
        await expect(build({ status: TournamentStatus.ONGOING }).command.execute(5, 1)).rejects.toThrow(/closed/);
    });

    it('refuses a team that is not locked', async () => {
        await expect(build({ teamStatus: TeamStatus.DRAFT }).command.execute(5, 1)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('is idempotent: a second check-in keeps the first timestamp and publishes nothing', async () => {
        const first = new Date(Date.now() - 5000);
        const { command, teamRepo, realtime } = build({ checkedInAt: first });
        await expect(command.execute(5, 1)).resolves.toMatchObject({ checked_in_at: first });
        expect(teamRepo.save).not.toHaveBeenCalled();
        expect(realtime.toTeam).not.toHaveBeenCalled();
    });

    it('404s on an unknown team', async () => {
        await expect(build({ noTeam: true }).command.execute(5, 1)).rejects.toBeInstanceOf(NotFoundException);
    });
});
