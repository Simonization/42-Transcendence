/**
 * An in-memory stand-in for TypeORM's EntityManager, covering the calls the bracket engine and
 * the match flow make: create / save / findOne / find / count / update, `where` with equality,
 * In(), and nested relation criteria. Rows are cloned on the way in and out, like a database.
 *
 * Named *.testing-spec.ts so the build excludes it and jest does not run it as a suite.
 */
import { FindOperator } from 'typeorm';
import { Match } from '../../matches/entities/match.entity';
import { Team } from '../../teams/entities/team.entity';
import { Tournament } from '../entities/tournament.entity';
import { TournamentPhase } from '../entities/tournament-phase.entity';

type Row = Record<string, any>;
type Ctor = new () => any;

function matches(row: Row, where: Row | undefined): boolean {
    if (!where) return true;
    return Object.entries(where).every(([key, expected]) => {
        const actual = row[key];
        if (expected instanceof FindOperator) {
            if (expected.type === 'in') return (expected.value as any[]).includes(actual);
            throw new Error(`FakeEntityManager: unsupported operator ${expected.type}`);
        }
        if (expected !== null && typeof expected === 'object' && !(expected instanceof Date)) {
            return actual != null && typeof actual === 'object' && matches(actual, expected);
        }
        return actual === expected;
    });
}

const clone = <T>(ctor: Ctor, row: Row): T => Object.assign(new ctor(), structuredClone(row));

export class FakeEntityManager {
    private tables = new Map<string, Map<number, Row>>();
    private nextId = new Map<string, number>();

    private table(ctor: Ctor) {
        if (!this.tables.has(ctor.name)) this.tables.set(ctor.name, new Map());
        return this.tables.get(ctor.name)!;
    }

    /** Relations the code under test loads through `relations: [...]`. */
    private loadRelations(ctor: Ctor, row: Row, relations: string[] = []): Row {
        const out = { ...row };
        if (ctor === Tournament) {
            if (relations.includes('teams')) {
                out.teams = [...this.table(Team).values()]
                    .filter((t) => t.tournament?.id === row.id)
                    .map((t) => clone(Team, t));
            }
            if (relations.includes('phases')) {
                out.phases = [...this.table(TournamentPhase).values()]
                    .filter((p) => p.tournament_id === row.id)
                    .map((p) => clone(TournamentPhase, p));
            }
        }
        if (ctor === Match) {
            for (const slot of ['team1', 'team2']) {
                if (relations.includes(slot)) {
                    const id = row[`${slot}_id`];
                    out[slot] = id != null ? clone(Team, this.table(Team).get(id)!) : null;
                }
            }
        }
        return out;
    }

    create<T>(ctor: new () => T, data: Partial<T>): T {
        return Object.assign(new ctor() as any, data);
    }

    async save(ctorOrEntity: any, maybeEntity?: any): Promise<any> {
        const ctor: Ctor = maybeEntity !== undefined ? ctorOrEntity : ctorOrEntity.constructor;
        const entity = maybeEntity !== undefined ? maybeEntity : ctorOrEntity;
        if (Array.isArray(entity)) {
            const saved: any[] = [];
            for (const e of entity) saved.push(await this.save(ctor, e));
            return saved;
        }
        const table = this.table(ctor);
        if (entity.id == null) {
            const id = (this.nextId.get(ctor.name) ?? 0) + 1;
            this.nextId.set(ctor.name, id);
            entity.id = id;
        }
        const plain: Row = {};
        for (const [k, v] of Object.entries(entity)) {
            // Loaded relations are not columns; only keep plain values and nested id refs.
            if (Array.isArray(v) && k !== 'seed_order') continue;
            plain[k] = v;
        }
        table.set(entity.id, { ...(table.get(entity.id) ?? {}), ...structuredClone(plain) });
        return entity;
    }

    async findOne<T>(ctor: new () => T, opts: { where?: Row; relations?: string[] } = {}): Promise<T | null> {
        const row = [...this.table(ctor).values()].find((r) => matches(r, opts.where));
        return row ? clone<T>(ctor, this.loadRelations(ctor, row, opts.relations)) : null;
    }

    async findOneBy<T>(ctor: new () => T, where: Row): Promise<T | null> {
        return this.findOne(ctor, { where });
    }

    async find<T>(ctor: new () => T, opts: { where?: Row; relations?: string[] } = {}): Promise<T[]> {
        return [...this.table(ctor).values()]
            .filter((r) => matches(r, opts.where))
            .sort((a, b) => a.id - b.id)
            .map((r) => clone<T>(ctor, this.loadRelations(ctor, r, opts.relations)));
    }

    async count(ctor: Ctor, opts: { where?: Row } = {}): Promise<number> {
        return [...this.table(ctor).values()].filter((r) => matches(r, opts.where)).length;
    }

    async update(ctor: Ctor, criteria: number | Row, patch: Row): Promise<void> {
        const where = typeof criteria === 'number' ? { id: criteria } : criteria;
        for (const row of this.table(ctor).values()) {
            if (matches(row, where)) Object.assign(row, structuredClone(patch));
        }
    }

    // --- test helpers ---

    all<T>(ctor: new () => T): T[] {
        return [...this.table(ctor).values()].sort((a, b) => a.id - b.id).map((r) => clone<T>(ctor, r));
    }

    get<T>(ctor: new () => T, id: number): T {
        const row = this.table(ctor).get(id);
        if (!row) throw new Error(`${ctor.name} ${id} not found`);
        return clone<T>(ctor, row);
    }
}

/** A registration-open tournament with one phase and `teamCount` teams (ids 1..n, LOCKED). */
export async function seedTournament(
    manager: FakeEntityManager,
    opts: {
        teamCount: number;
        phases?: Partial<TournamentPhase>[];
        statuses?: Record<number, string>;
        max?: number | null;
    },
) {
    const tournament = await manager.save(Tournament, {
        name: 'Cup',
        status: 'REGISTRATION_OPEN',
        max_participants: opts.max ?? null,
        current_phase_order: 1,
        seed_order: null,
        finished_at: null,
    });
    const phaseDefs = opts.phases ?? [{ type: 'SINGLE_ELIMINATION', teams_limit_start: 2, teams_limit_end: 1 }];
    const phases: TournamentPhase[] = [];
    for (const [i, def] of phaseDefs.entries()) {
        phases.push(await manager.save(TournamentPhase, { order: i + 1, game_id: 1, tournament_id: tournament.id, ...def }));
    }
    await manager.update(Tournament, tournament.id, { active_phase_id: phases[0].id });

    const teams: Team[] = [];
    for (let i = 1; i <= opts.teamCount; i++) {
        teams.push(
            await manager.save(Team, {
                name: `T${i}`,
                status: opts.statuses?.[i] ?? 'LOCKED',
                captain_id: 100 + i,
                tournament: { id: tournament.id },
            }),
        );
    }
    return { tournament: manager.get(Tournament, tournament.id), phases, teams };
}
