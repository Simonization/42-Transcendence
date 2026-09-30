import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { Match, MatchStatus } from '../entities/match.entity';
import { Tournament } from '../../tournaments/entities/tournament.entity';
import { BracketEngine, newEvents } from '../../tournaments/services/bracket-engine.service';
import { BracketGeneratorService } from '../../tournaments/services/bracket-generator.service';
import { FakeEntityManager, seedTournament } from '../../tournaments/services/fake-entity-manager.testing-spec';
import { AdminGuard } from '../../auth/guards/admin.guard';
import { MatchesController } from '../matches.controller';
import { TournamentsController } from '../../tournaments/tournaments.controller';
import { MatchFlowService } from './match-flow.service';

/*
 * seedTournament gives team i the captain 100 + i. The admins map adds team admins on top.
 * Team 1 v team 4 and team 2 v team 3 are the semi-finals of a 4-team bracket.
 */
const CAPTAIN = (team: number) => 100 + team;
const STRANGER = 999;

async function setup(admins: Record<number, number[]> = {}) {
    const manager = new FakeEntityManager();
    const engine = new BracketEngine(new BracketGeneratorService());
    const { tournament, phases, teams } = await seedTournament(manager, { teamCount: 4 });

    await manager.update(Tournament, tournament.id, { status: 'ONGOING', seed_order: [1, 2, 3, 4] });
    await engine.startPhase(manager as any, tournament.id, phases[0], teams, newEvents());

    const dataSource = {
        transaction: (fn: (m: any) => any) => fn(manager),
        getRepository: () => ({
            findOne: ({ where }: any) => manager.findOne(Match, { where, relations: ['team1', 'team2'] }),
        }),
    };
    const permissions = {
        isAdmin: jest.fn(
            async (teamId: number, captainId: number, userId: number) =>
                captainId === userId || (admins[teamId] ?? []).includes(userId),
        ),
    };
    const notifier = {
        dispatch: jest.fn(),
        matchesReady: jest.fn(async () => undefined),
        scoreReported: jest.fn(async () => undefined),
        disputed: jest.fn(async () => undefined),
    };
    const flow = new MatchFlowService(dataSource as any, engine, notifier as any, permissions as any);

    const semis = manager.all(Match).filter((m) => m.round_order === 1);
    const semi = semis.find((m) => m.team1_id === 1 && m.team2_id === 4)!;
    return { manager, flow, notifier, semi, semis, tournament };
}

describe('MatchFlowService', () => {
    describe('report', () => {
        it('lets the captain of either team report, and waits for confirmation', async () => {
            const { flow, manager, semi, notifier } = await setup();
            await flow.report(semi.id, CAPTAIN(4), { team1Score: 1, team2Score: 3 });

            expect(manager.get(Match, semi.id)).toMatchObject({
                status: MatchStatus.AWAITING_CONFIRMATION,
                team1_score: 1,
                team2_score: 3,
                reported_by_team_id: 4,
            });
            expect(notifier.scoreReported).toHaveBeenCalledWith(semi.id);
        });

        it('lets a team admin report', async () => {
            const { flow, manager, semi } = await setup({ 1: [555] });
            await flow.report(semi.id, 555, { team1Score: 2, team2Score: 0 });
            expect(manager.get(Match, semi.id).reported_by_team_id).toBe(1);
        });

        it('refuses anyone who is not captain or admin of a team in the match', async () => {
            const { flow, semi } = await setup();
            await expect(flow.report(semi.id, STRANGER, { team1Score: 2, team2Score: 0 })).rejects.toBeInstanceOf(
                ForbiddenException,
            );
            // Captain of a team in the tournament but not in this match.
            await expect(flow.report(semi.id, CAPTAIN(2), { team1Score: 2, team2Score: 0 })).rejects.toBeInstanceOf(
                ForbiddenException,
            );
        });

        it('refuses a draw', async () => {
            const { flow, semi } = await setup();
            await expect(flow.report(semi.id, CAPTAIN(1), { team1Score: 1, team2Score: 1 })).rejects.toBeInstanceOf(
                BadRequestException,
            );
        });

        it('refuses a match whose opponent is not known yet', async () => {
            const { flow, semi } = await setup();
            await expect(
                flow.report(semi.winner_next_match_id, CAPTAIN(1), { team1Score: 1, team2Score: 0 }),
            ).rejects.toBeInstanceOf(ConflictException);
        });

        it('lets the reporter correct its report, but not the other team overwrite it', async () => {
            const { flow, manager, semi } = await setup();
            await flow.report(semi.id, CAPTAIN(1), { team1Score: 2, team2Score: 0 });
            await flow.report(semi.id, CAPTAIN(1), { team1Score: 2, team2Score: 1 });
            expect(manager.get(Match, semi.id).team2_score).toBe(1);
            await expect(flow.report(semi.id, CAPTAIN(4), { team1Score: 0, team2Score: 2 })).rejects.toBeInstanceOf(
                ConflictException,
            );
        });
    });

    describe('confirm', () => {
        it('finishes the match when the other team confirms, and advances the winner', async () => {
            const { flow, manager, semi } = await setup();
            await flow.report(semi.id, CAPTAIN(1), { team1Score: 0, team2Score: 2 });
            await flow.confirm(semi.id, CAPTAIN(4));

            const done = manager.get(Match, semi.id);
            expect(done).toMatchObject({ status: MatchStatus.FINISHED, winner_id: 4, score: '0-2' });
            const final = manager.get(Match, semi.winner_next_match_id);
            expect(semi.winner_next_match_slot === 2 ? final.team2_id : final.team1_id).toBe(4);
        });

        it('refuses the reporting team, and strangers', async () => {
            const { flow, semi } = await setup({ 1: [555] });
            await flow.report(semi.id, CAPTAIN(1), { team1Score: 2, team2Score: 0 });
            await expect(flow.confirm(semi.id, CAPTAIN(1))).rejects.toBeInstanceOf(ForbiddenException);
            await expect(flow.confirm(semi.id, 555)).rejects.toBeInstanceOf(ForbiddenException);
            await expect(flow.confirm(semi.id, STRANGER)).rejects.toBeInstanceOf(ForbiddenException);
        });

        it('refuses someone who is admin of both teams', async () => {
            const { flow, semi } = await setup({ 4: [CAPTAIN(1)] });
            await flow.report(semi.id, CAPTAIN(1), { team1Score: 2, team2Score: 0 });
            await expect(flow.confirm(semi.id, CAPTAIN(1))).rejects.toBeInstanceOf(ForbiddenException);
        });

        it('refuses when nothing was reported', async () => {
            const { flow, semi } = await setup();
            await expect(flow.confirm(semi.id, CAPTAIN(4))).rejects.toBeInstanceOf(ConflictException);
        });
    });

    describe('dispute and resolve', () => {
        it('moves to DISPUTED, notifies admins, and cannot then be confirmed', async () => {
            const { flow, manager, semi, notifier } = await setup();
            await flow.report(semi.id, CAPTAIN(1), { team1Score: 2, team2Score: 0 });
            await expect(flow.dispute(semi.id, CAPTAIN(1))).rejects.toBeInstanceOf(ForbiddenException);
            await flow.dispute(semi.id, CAPTAIN(4));

            expect(manager.get(Match, semi.id).status).toBe(MatchStatus.DISPUTED);
            expect(notifier.disputed).toHaveBeenCalledWith(semi.id);
            await expect(flow.confirm(semi.id, CAPTAIN(4))).rejects.toBeInstanceOf(ConflictException);
        });

        it('lets an admin resolve a disputed match with a different score', async () => {
            const { flow, manager, semi } = await setup();
            await flow.report(semi.id, CAPTAIN(1), { team1Score: 2, team2Score: 0 });
            await flow.dispute(semi.id, CAPTAIN(4));
            await flow.resolve(semi.id, { team1Score: 1, team2Score: 3 });

            expect(manager.get(Match, semi.id)).toMatchObject({
                status: MatchStatus.FINISHED,
                winner_id: 4,
                team1_score: 1,
                team2_score: 3,
            });
        });

        it('lets an admin resolve a READY match directly, but not a finished one', async () => {
            const { flow, semi } = await setup();
            await flow.resolve(semi.id, { team1Score: 3, team2Score: 1 });
            await expect(flow.resolve(semi.id, { team1Score: 0, team2Score: 1 })).rejects.toBeInstanceOf(
                ConflictException,
            );
        });
    });

    describe('undo', () => {
        it('reverts a confirmed result to READY', async () => {
            const { flow, manager, semi } = await setup();
            await flow.report(semi.id, CAPTAIN(1), { team1Score: 2, team2Score: 0 });
            await flow.confirm(semi.id, CAPTAIN(4));
            await flow.undo(semi.id);

            expect(manager.get(Match, semi.id)).toMatchObject({
                status: MatchStatus.READY,
                winner_id: null,
                reported_by_team_id: null,
            });
        });
    });

    describe('admin PATCH', () => {
        it('refuses a winner that is not one of the two teams', async () => {
            const { flow, semi } = await setup();
            await expect(flow.adminUpdate(semi.id, { winner_id: 2 })).rejects.toBeInstanceOf(BadRequestException);
        });

        it('advances a winner set through PATCH like any other result', async () => {
            const { flow, manager, semi } = await setup();
            await flow.adminUpdate(semi.id, { winner_id: 4, score: '1-2' });
            expect(manager.get(Match, semi.id)).toMatchObject({ status: MatchStatus.FINISHED, team2_score: 2 });
            const final = manager.get(Match, semi.winner_next_match_id);
            expect([final.team1_id, final.team2_id]).toContain(4);
        });
    });
});

describe('route guards', () => {
    const guardsOf = (target: object, method: string): unknown[] =>
        Reflect.getMetadata(GUARDS_METADATA, (target as any).prototype[method]) ?? [];

    it.each(['create', 'update', 'remove', 'resolve', 'undo'])('matches.%s is admin-only', (method) => {
        expect(guardsOf(MatchesController, method)).toContain(AdminGuard);
    });

    it.each(['report', 'confirm', 'dispute'])('matches.%s is open to logged-in users (checked per match)', (method) => {
        expect(guardsOf(MatchesController, method)).not.toContain(AdminGuard);
    });

    it.each(['setSeeding', 'withdraw', 'start'])('tournaments.%s is admin-only', (method) => {
        expect(guardsOf(TournamentsController, method)).toContain(AdminGuard);
    });
});
