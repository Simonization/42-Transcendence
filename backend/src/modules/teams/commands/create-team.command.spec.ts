import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { CreateTeamCommand } from './create-team.command';
import { TeamStatus } from '../entities/team.entity';
import { LookingForTeam } from '../entities/looking-for-team.entity';
import { TournamentStatus } from '../../tournaments/entities/tournament.entity';
import { mockDataSource, mockQueryBuilder, mockRealtime, mockRepo } from '../testing/test-mocks-spec';

describe('CreateTeamCommand', () => {
    const user: any = { id: 7, username: 'neo' };
    const dto = { name: 'Reds', tournament_id: 9 };

    function build(opts: { tournament?: any; existingTeam?: any } = {}) {
        const tournament = opts.tournament === undefined
            ? { id: 9, status: TournamentStatus.REGISTRATION_OPEN }
            : opts.tournament;
        const teamRepo = mockRepo();
        // First query builder call: "already in a team here?"; the rest: join-code uniqueness.
        teamRepo.createQueryBuilder
            .mockReturnValueOnce(mockQueryBuilder({ one: opts.existingTeam ?? null }))
            .mockReturnValue(mockQueryBuilder({ exists: false }));
        const tournamentRepo = mockRepo({ findOneBy: jest.fn().mockResolvedValue(tournament) });
        const ctx = mockDataSource();
        return { ...ctx, teamRepo, command: new CreateTeamCommand(teamRepo, tournamentRepo, ctx.dataSource, mockRealtime()) };
    }

    it('creates a DRAFT team with the user as captain/member and a fresh join code', async () => {
        const { command, teamRepo } = build();

        const team: any = await command.execute(dto, user);

        expect(team).toMatchObject({ name: 'Reds', status: TeamStatus.DRAFT, captain_id: 7, members: [user] });
        expect(team.join_code).toMatch(/^[A-Za-z0-9]{10}$/);
        expect(teamRepo.save).toHaveBeenCalled();
    });

    it('removes the creator from the looking-for-team board', async () => {
        const { command, manager } = build();
        await command.execute(dto, user);
        expect(manager.delete).toHaveBeenCalledWith(LookingForTeam, { userId: 7, tournamentId: 9 });
    });

    it('refuses a second team for the same user in the same tournament (409)', async () => {
        const { command, teamRepo } = build({ existingTeam: { id: 3 } });
        await expect(command.execute(dto, user)).rejects.toBeInstanceOf(ConflictException);
        expect(teamRepo.save).not.toHaveBeenCalled();
    });

    it('trims the name, and refuses one that is too short once trimmed (400)', async () => {
        const team: any = await build().command.execute({ name: '  Reds  ', tournament_id: 9 }, user);
        expect(team.name).toBe('Reds');
        await expect(build().command.execute({ name: '  ab   ', tournament_id: 9 }, user))
            .rejects.toBeInstanceOf(BadRequestException);
    });

    it('refuses when registration is not open, or the tournament does not exist', async () => {
        await expect(build({ tournament: { id: 9, status: TournamentStatus.ONGOING } }).command.execute(dto, user))
            .rejects.toBeInstanceOf(BadRequestException);
        await expect(build({ tournament: null }).command.execute(dto, user))
            .rejects.toBeInstanceOf(NotFoundException);
    });
});
