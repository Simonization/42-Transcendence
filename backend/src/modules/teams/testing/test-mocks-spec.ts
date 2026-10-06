/**
 * Small hand-rolled mocks for the teams specs: repositories, a chainable query builder and a
 * DataSource/QueryRunner pair. No database is involved.
 */

/** A chainable TypeORM query-builder stub whose terminal calls resolve to the given values. */
export function mockQueryBuilder(result: { many?: any[]; one?: any; exists?: boolean } = {}) {
    const qb: any = {};
    for (const m of [
        'select', 'addSelect', 'innerJoin', 'leftJoin', 'innerJoinAndSelect', 'leftJoinAndSelect',
        'where', 'andWhere', 'orderBy',
    ]) {
        qb[m] = jest.fn().mockReturnValue(qb);
    }
    qb.getMany = jest.fn().mockResolvedValue(result.many ?? []);
    qb.getOne = jest.fn().mockResolvedValue(result.one ?? null);
    qb.getExists = jest.fn().mockResolvedValue(result.exists ?? false);
    return qb;
}

export function mockRepo(overrides: Record<string, any> = {}) {
    const repo: any = {
        findOne: jest.fn(),
        findOneBy: jest.fn(),
        find: jest.fn(),
        findBy: jest.fn(),
        existsBy: jest.fn(),
        count: jest.fn(),
        create: jest.fn((x) => x),
        save: jest.fn(async (x) => x),
        delete: jest.fn().mockResolvedValue({ affected: 1 }),
        update: jest.fn(),
        createQueryBuilder: jest.fn(),
        ...overrides,
    };
    // `repo.manager.transaction(fn)` runs fn with an EntityManager that forwards to this repo
    // (the entity-class argument is dropped), for commands that lock rows in a transaction.
    const forward = (method: string) => (...args: any[]) =>
        typeof args[0] === 'function' ? repo[method](...args.slice(1)) : repo[method](...args);
    const manager: any = {
        findOne: forward('findOne'),
        findOneBy: forward('findOneBy'),
        find: forward('find'),
        count: forward('count'),
        save: forward('save'),
        update: forward('update'),
        delete: forward('delete'),
        query: jest.fn().mockResolvedValue([]),
    };
    manager.transaction = jest.fn(async (fn: (m: any) => any) => fn(manager));
    repo.manager = repo.manager ?? manager;
    return repo;
}

/** A DataSource whose single QueryRunner exposes `manager`; returns handles for assertions. */
export function mockDataSource(managerOverrides: Record<string, any> = {}) {
    const manager: any = {
        findOne: jest.fn(),
        findOneBy: jest.fn(),
        save: jest.fn(async (x) => x),
        delete: jest.fn().mockResolvedValue({ affected: 1 }),
        createQueryBuilder: jest.fn(),
        query: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        ...managerOverrides,
    };
    const runner: any = {
        connect: jest.fn(),
        startTransaction: jest.fn(),
        commitTransaction: jest.fn(),
        rollbackTransaction: jest.fn(),
        release: jest.fn(),
        manager,
    };
    const dataSource: any = { createQueryRunner: jest.fn(() => runner), manager };
    return { dataSource, runner, manager };
}

/** RealtimeService stub: every publish method is a jest.fn so specs can assert on the calls. */
export function mockRealtime() {
    return {
        toUser: jest.fn(),
        toTeam: jest.fn(),
        toTournament: jest.fn(),
        toMatch: jest.fn(),
        leaveTeamRoom: jest.fn(),
    } as any;
}

export function mockNotifications() {
    return { sendNotification: jest.fn().mockResolvedValue({}) } as any;
}

/** Permissions stub: `assertAdmin` resolves (or rejects when `allow` is false). */
export function mockPermissions(allow = true) {
    const { ForbiddenException } = require('@nestjs/common');
    return {
        assertAdmin: jest.fn(async () => {
            if (!allow) throw new ForbiddenException('Only the captain or a team admin can do this');
        }),
        isAdmin: jest.fn().mockResolvedValue(allow),
        listAdminIds: jest.fn().mockResolvedValue([]),
    } as any;
}
