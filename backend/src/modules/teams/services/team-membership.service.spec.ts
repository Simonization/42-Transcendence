import { ConflictException } from '@nestjs/common';
import { TeamMembershipService } from './team-membership.service';
import { Team, TeamStatus } from '../entities/team.entity';
import { TeamAdmin } from '../entities/team-admin.entity';
import { TeamInvitation } from '../entities/team-invitation.entity';
import { LookingForTeam } from '../entities/looking-for-team.entity';
import { mockDataSource, mockQueryBuilder } from '../testing/test-mocks-spec';

describe('TeamMembershipService', () => {
    const USER = 7;
    const service = new TeamMembershipService();

    function managerWith(otherTeams: any[]) {
        const { manager } = mockDataSource();
        manager.createQueryBuilder.mockReturnValue(mockQueryBuilder({ many: otherTeams }));
        return manager;
    }

    const otherTeam = (over: any = {}) => ({
        id: 3,
        name: 'Old team',
        status: TeamStatus.DRAFT,
        captain_id: 100,
        members: [{ id: 100 }, { id: USER }],
        ...over,
    });

    it('does nothing when the user has no other team in the tournament', async () => {
        const manager = managerWith([]);
        await service.assertCanJoin(manager, USER, 1, 99);
        expect(manager.delete).not.toHaveBeenCalled();
        expect(manager.save).not.toHaveBeenCalled();
    });

    it('throws 409 when the user is locked into another team, without touching anything', async () => {
        const manager = managerWith([otherTeam({ status: TeamStatus.LOCKED })]);

        await expect(service.assertCanJoin(manager, USER, 1, 99)).rejects.toBeInstanceOf(ConflictException);
        await expect(service.assertCanJoin(manager, USER, 1, 99)).rejects.toThrow(/Old team/);
        expect(manager.delete).not.toHaveBeenCalled();
        expect(manager.save).not.toHaveBeenCalled();
    });

    it('removes the user from another DRAFT team and deletes their team_admins row there', async () => {
        const draft = otherTeam();
        const manager = managerWith([draft]);

        await service.assertCanJoin(manager, USER, 1, 99);

        expect(manager.delete).toHaveBeenCalledWith(TeamAdmin, { teamId: 3, userId: USER });
        expect(draft.members.map((m: any) => m.id)).toEqual([100]);
        expect(manager.save).toHaveBeenCalledWith(draft);
    });

    it('hands the captaincy on when the departing user captained the draft team', async () => {
        const draft = otherTeam({ captain_id: USER, members: [{ id: USER }, { id: 55 }] });
        const manager = managerWith([draft]);

        await service.assertCanJoin(manager, USER, 1, 99);

        expect(draft.captain_id).toBe(55);
        // the new captain's now-redundant admin row is dropped too
        expect(manager.delete).toHaveBeenCalledWith(TeamAdmin, { teamId: 3, userId: 55 });
        expect(manager.delete).not.toHaveBeenCalledWith(Team, expect.anything());
    });

    it('deletes a draft team the user captained alone', async () => {
        const solo = otherTeam({ captain_id: USER, members: [{ id: USER }] });
        const manager = managerWith([solo]);

        await service.assertCanJoin(manager, USER, 1, 99);

        expect(manager.delete).toHaveBeenCalledWith(TeamAdmin, { teamId: 3, userId: USER });
        expect(manager.delete).toHaveBeenCalledWith(TeamInvitation, { team_id: 3 });
        expect(manager.delete).toHaveBeenCalledWith(Team, { id: 3 });
    });

    it('clears the looking-for-team flag for that tournament', async () => {
        const { manager } = mockDataSource();
        await service.clearLookingForTeam(manager, USER, 1);
        expect(manager.delete).toHaveBeenCalledWith(LookingForTeam, { userId: USER, tournamentId: 1 });
    });
});
