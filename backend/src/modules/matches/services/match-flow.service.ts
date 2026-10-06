import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    forwardRef,
    Inject,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { Match, MatchStatus, SETTLED_MATCH_STATUSES } from '../entities/match.entity';
import { UserMatch } from '../entities/user-match.entity';
import { Team } from '../../teams/entities/team.entity';
import { TeamPermissionsService } from '../../teams/services/team-permissions.service';
import {
    BracketEngine,
    EngineEvents,
    lockMatch,
    lockTournament,
    newEvents,
} from '../../tournaments/services/bracket-engine.service';
import { TournamentPhase } from '../../tournaments/entities/tournament-phase.entity';
import { MatchNotifier } from '../../tournaments/services/match-notifier.service';
import { BracketPublisher } from '../../tournaments/services/bracket-publisher.service';
import { ReportScoreDto } from '../dto/report-score.dto';
import { UpdateMatchDto } from '../dto/update-match.dto';

interface Sides {
    team1: Team;
    team2: Team;
    /** Whether the acting user is captain or admin of each team. */
    admin1: boolean;
    admin2: boolean;
}

/**
 * The match-result loop: a team reports, the other team confirms (or disputes), a global admin
 * resolves disputes or overrides and can undo a result. One transaction per operation, with the
 * match row locked so a report and a confirm cannot interleave. Notifications go out after the
 * commit.
 */
@Injectable()
export class MatchFlowService {
    constructor(
        private readonly dataSource: DataSource,
        @Inject(forwardRef(() => BracketEngine)) private readonly engine: BracketEngine,
        @Inject(forwardRef(() => MatchNotifier)) private readonly notifier: MatchNotifier,
        private readonly permissions: TeamPermissionsService,
        @Inject(forwardRef(() => BracketPublisher)) private readonly publisher: BracketPublisher,
    ) {}

    /** Captain or team admin of either team reports the score. → AWAITING_CONFIRMATION */
    async report(matchId: number, userId: number, dto: ReportScoreDto): Promise<Match> {
        await this.dataSource.transaction(async (manager) => {
            const match = await this.lock(manager, matchId);
            const sides = await this.sides(manager, match, userId);
            if (!sides.admin1 && !sides.admin2) {
                throw new ForbiddenException('Only the captain or an admin of a team in this match can report its score.');
            }
            assertScores(dto);

            let reporter: number;
            if (match.status === MatchStatus.READY || match.status === MatchStatus.ONGOING) {
                reporter = sides.admin1 ? sides.team1.id : sides.team2.id;
            } else if (match.status === MatchStatus.AWAITING_CONFIRMATION) {
                // The reporting team may correct its report until the other side answers.
                const ownReport =
                    (match.reported_by_team_id === sides.team1.id && sides.admin1) ||
                    (match.reported_by_team_id === sides.team2.id && sides.admin2);
                if (!ownReport) {
                    throw new ConflictException('The other team already reported; confirm or dispute that score.');
                }
                reporter = match.reported_by_team_id!;
            } else {
                throw new ConflictException(`A ${match.status} match cannot take a score report.`);
            }

            match.team1_score = dto.team1Score;
            match.team2_score = dto.team2Score;
            match.reported_by_team_id = reporter;
            match.reported_at = new Date();
            match.status = MatchStatus.AWAITING_CONFIRMATION;
            await manager.save(Match, match);
        });

        this.notifier.dispatch(this.notifier.scoreReported(matchId));
        void this.publisher.matchChanged(matchId, 'score_reported');
        return this.reload(matchId);
    }

    /** Captain or team admin of the other team accepts the reported score. → FINISHED */
    async confirm(matchId: number, userId: number): Promise<Match> {
        const events = newEvents();
        await this.dataSource.transaction(async (manager) => {
            const match = await this.lock(manager, matchId);
            await this.assertOpponent(manager, match, userId, 'confirm');
            const winner = match.team1_score! > match.team2_score! ? match.team1_id! : match.team2_id!;
            await this.engine.finishMatch(
                manager,
                match,
                winner,
                { team1: match.team1_score, team2: match.team2_score },
                events,
            );
        });
        this.afterFinish(matchId, 'match_finished', events);
        return this.reload(matchId);
    }

    /** Captain or team admin of the other team rejects the reported score. → DISPUTED */
    async dispute(matchId: number, userId: number): Promise<Match> {
        await this.dataSource.transaction(async (manager) => {
            const match = await this.lock(manager, matchId);
            await this.assertOpponent(manager, match, userId, 'dispute');
            match.status = MatchStatus.DISPUTED;
            await manager.save(Match, match);
        });
        this.notifier.dispatch(this.notifier.disputed(matchId));
        void this.publisher.matchChanged(matchId, 'match_disputed');
        return this.reload(matchId);
    }

    /** Global admin sets the final score from any unsettled state. → FINISHED */
    async resolve(matchId: number, dto: ReportScoreDto): Promise<Match> {
        assertScores(dto);
        const events = newEvents();
        await this.dataSource.transaction(async (manager) => {
            const match = await this.lock(manager, matchId);
            const winner = dto.team1Score > dto.team2Score ? match.team1_id : match.team2_id;
            if (winner == null) throw new BadRequestException('Both teams must be known before the match can finish.');
            await this.engine.finishMatch(manager, match, winner, { team1: dto.team1Score, team2: dto.team2Score }, events);
        });
        this.afterFinish(matchId, 'match_resolved', events);
        return this.reload(matchId);
    }

    /** Global admin reverts a finished match to READY (see BracketEngine.undoMatch). */
    async undo(matchId: number): Promise<Match> {
        await this.dataSource.transaction(async (manager) => {
            const match = await this.lock(manager, matchId);
            await this.engine.undoMatch(manager, match);
        });
        // A reopened match is READY again (its chat is reused) and may have reopened the tournament.
        void this.publisher.matchChanged(matchId, 'match_undone', undefined, true);
        return this.reload(matchId);
    }

    /**
     * PATCH /matches/:id (global admin). Setting a winner or FINISHED goes through the bracket
     * engine, so the winner is checked against the two teams and advances like any other result.
     */
    async adminUpdate(matchId: number, dto: UpdateMatchDto): Promise<Match> {
        const events = newEvents();
        await this.dataSource.transaction(async (manager) => {
            const match = await this.lock(manager, matchId);

            if (dto.game_data) match.game_data = { ...(match.game_data ?? {}), ...dto.game_data };
            for (const p of dto.participants ?? []) {
                await manager.update(UserMatch, { match_id: matchId, user_id: p.userId }, { result: p.result });
            }

            const finishing = dto.winner_id != null || dto.status === MatchStatus.FINISHED;
            if (finishing) {
                const winner = dto.winner_id ?? match.winner_id;
                if (winner == null) throw new BadRequestException('winner_id is required to finish a match');
                const [s1, s2] = parseScore(dto.score);
                await this.engine.finishMatch(manager, match, winner, { team1: s1, team2: s2 }, events);
                return;
            }

            if (dto.status) {
                if (SETTLED_MATCH_STATUSES.includes(dto.status)) {
                    throw new BadRequestException(`Use /resolve or /undo rather than setting ${dto.status} directly.`);
                }
                match.status = dto.status;
            }
            if (dto.score !== undefined) match.score = dto.score;
            await manager.save(Match, match);
        });
        this.afterFinish(matchId, 'match_edited', events);
        return this.reload(matchId);
    }

    private afterFinish(matchId: number, reason: string, events: EngineEvents) {
        this.notifier.dispatch(this.notifier.matchesReady(events.readyMatchIds));
        void this.publisher.matchChanged(matchId, reason, events);
    }

    /**
     * Locks the match's tournament, then the match (the engine's lock order, see
     * bracket-engine.service.ts), and returns the match as read under the lock.
     */
    private async lock(manager: EntityManager, matchId: number): Promise<Match> {
        const peek = await manager.findOne(Match, { where: { id: matchId } });
        if (!peek) throw new NotFoundException(`Match ${matchId} not found`);
        const tournamentId =
            peek.tournament_id ??
            (await manager.findOne(TournamentPhase, { where: { id: peek.phase_id } }))?.tournament_id;
        if (tournamentId != null) await lockTournament(manager, tournamentId);
        const match = await lockMatch(manager, matchId);
        if (!match) throw new NotFoundException(`Match ${matchId} not found`);
        return match;
    }

    private async sides(manager: EntityManager, match: Match, userId: number): Promise<Sides> {
        if (match.team1_id == null || match.team2_id == null) {
            throw new ConflictException('Both teams must be known before this match can be reported.');
        }
        const team1 = await manager.findOne(Team, { where: { id: match.team1_id } });
        const team2 = await manager.findOne(Team, { where: { id: match.team2_id } });
        if (!team1 || !team2) throw new NotFoundException('A team of this match no longer exists.');
        return {
            team1,
            team2,
            admin1: await this.permissions.isAdmin(team1.id, team1.captain_id, userId),
            admin2: await this.permissions.isAdmin(team2.id, team2.captain_id, userId),
        };
    }

    /** Confirm / dispute: only the team that did not report, and never the reporter itself. */
    private async assertOpponent(manager: EntityManager, match: Match, userId: number, verb: string) {
        if (match.status !== MatchStatus.AWAITING_CONFIRMATION) {
            throw new ConflictException(`There is no reported score to ${verb}.`);
        }
        const sides = await this.sides(manager, match, userId);
        const reporterIs1 = match.reported_by_team_id === sides.team1.id;
        const opponentAdmin = reporterIs1 ? sides.admin2 : sides.admin1;
        const reporterAdmin = reporterIs1 ? sides.admin1 : sides.admin2;
        if (!opponentAdmin) {
            throw new ForbiddenException(`Only the captain or an admin of the opposing team can ${verb} this score.`);
        }
        if (reporterAdmin) {
            throw new ForbiddenException(`You reported this score; the other team has to ${verb} it.`);
        }
    }

    private async reload(matchId: number): Promise<Match> {
        const match = await this.dataSource.getRepository(Match).findOne({
            where: { id: matchId },
            relations: ['team1', 'team2'],
        });
        if (!match) throw new NotFoundException(`Match ${matchId} not found`);
        return match;
    }
}

function assertScores(dto: ReportScoreDto) {
    for (const v of [dto.team1Score, dto.team2Score]) {
        if (!Number.isInteger(v) || v < 0) throw new BadRequestException('Scores must be whole numbers, 0 or more.');
    }
    if (dto.team1Score === dto.team2Score) {
        throw new BadRequestException('Elimination matches cannot end in a draw.');
    }
}

function parseScore(score: string | undefined): [number | null, number | null] {
    const parts = (score ?? '').split(/[-:]/).map((s) => Number(s.trim()));
    if (parts.length !== 2 || parts.some((n) => !Number.isInteger(n) || n < 0)) return [null, null];
    return [parts[0], parts[1]];
}
