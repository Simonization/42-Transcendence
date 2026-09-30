import { ForbiddenException } from '@nestjs/common';
import { TeamPermissionsService } from './team-permissions.service';
import { mockRepo } from '../testing/test-mocks-spec';

describe('TeamPermissionsService', () => {
    const TEAM = 1;
    const CAPTAIN = 10;
    const ADMIN = 20;
    const MEMBER = 30;

    let adminRepo: any;
    let teamRepo: any;
    let service: TeamPermissionsService;

    /** `members` = ids currently on the roster; `admins` = ids that have a team_admins row. */
    function setup(members: number[], admins: number[]) {
        adminRepo = mockRepo({
            existsBy: jest.fn(async ({ userId }) => admins.includes(userId)),
            findBy: jest.fn(async () => admins.map((userId) => ({ userId }))),
        });
        teamRepo = mockRepo({
            existsBy: jest.fn(async ({ members: m }) => members.includes(m.id)),
        });
        service = new TeamPermissionsService(adminRepo, teamRepo);
    }

    it('treats the captain as an admin while they are a member', async () => {
        setup([CAPTAIN, MEMBER], []);
        await expect(service.isAdmin(TEAM, CAPTAIN, CAPTAIN)).resolves.toBe(true);
    });

    it('treats a promoted member as an admin', async () => {
        setup([CAPTAIN, ADMIN], [ADMIN]);
        await expect(service.isAdmin(TEAM, CAPTAIN, ADMIN)).resolves.toBe(true);
    });

    it('does not treat a plain member as an admin', async () => {
        setup([CAPTAIN, MEMBER], []);
        await expect(service.isAdmin(TEAM, CAPTAIN, MEMBER)).resolves.toBe(false);
    });

    it('denies an ex-member who still has a team_admins row (admin rights do not survive leaving)', async () => {
        setup([CAPTAIN], [ADMIN]);
        await expect(service.isAdmin(TEAM, CAPTAIN, ADMIN)).resolves.toBe(false);
    });

    it('denies a captain id that is no longer on the roster', async () => {
        setup([MEMBER], []);
        await expect(service.isAdmin(TEAM, CAPTAIN, CAPTAIN)).resolves.toBe(false);
    });

    it('assertAdmin resolves for admins and throws Forbidden otherwise', async () => {
        setup([CAPTAIN, MEMBER], []);
        await expect(service.assertAdmin(TEAM, CAPTAIN, CAPTAIN)).resolves.toBeUndefined();
        await expect(service.assertAdmin(TEAM, CAPTAIN, MEMBER)).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('listAdminIds returns the granted user ids', async () => {
        setup([CAPTAIN, ADMIN], [ADMIN]);
        await expect(service.listAdminIds(TEAM)).resolves.toEqual([ADMIN]);
    });
});
