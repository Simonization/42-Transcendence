import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Match } from '../../matches/entities/match.entity';
import { Team } from '../../teams/entities/team.entity';
import { TeamAdmin } from '../../teams/entities/team-admin.entity';
import { User } from '../../users/entities/user.entity';
import { ADMIN_ROLE, SUPER_ADMIN_ROLE } from '../../users/constants/user-roles';
import { NotificationsService } from '../../notifications/notifications.service';
import { NotificationDestination, NotificationType } from '../../notifications/entities/notification.entity';
import { Tournament } from '../entities/tournament.entity';

/**
 * Match-loop notifications, sent after the transaction commits. Delivery is best effort: a
 * failed notification is logged and never fails the request that caused it.
 */
@Injectable()
export class MatchNotifier {
    private readonly logger = new Logger(MatchNotifier.name);

    constructor(
        private readonly notifications: NotificationsService,
        @InjectRepository(Match) private readonly matchRepo: Repository<Match>,
        @InjectRepository(Team) private readonly teamRepo: Repository<Team>,
        @InjectRepository(TeamAdmin) private readonly adminRepo: Repository<TeamAdmin>,
        @InjectRepository(User) private readonly userRepo: Repository<User>,
        @InjectRepository(Tournament) private readonly tournamentRepo: Repository<Tournament>,
    ) {}

    /** Fire-and-forget wrapper for callers that must not wait on delivery. */
    dispatch(work: Promise<void>): void {
        work.catch((err) => this.logger.error(`Match notification failed: ${err?.message ?? err}`));
    }

    /** "Your match is ready": every member of both teams. */
    async matchesReady(matchIds: number[]): Promise<void> {
        if (!matchIds.length) return;
        const matches = await this.matchRepo.find({
            where: { id: In(matchIds) },
            relations: ['team1', 'team1.members', 'team2', 'team2.members'],
        });

        for (const match of matches) {
            if (!match.team1 || !match.team2) continue;
            const tournament = await this.tournamentName(match.tournament_id);
            for (const [team, opponent] of [
                [match.team1, match.team2],
                [match.team2, match.team1],
            ] as const) {
                const body = `Your match against ${opponent.name}${tournament} is ready. Play it, then report the score from the bracket.`;
                await this.sendAll(
                    (team.members ?? []).map((m) => m.id),
                    'match_ready',
                    body,
                    'Match ready',
                    this.data(match, team.id),
                );
            }
        }
    }

    /** "Confirm the score": the opposing team's captain and admins. */
    async scoreReported(matchId: number): Promise<void> {
        const match = await this.matchRepo.findOne({ where: { id: matchId }, relations: ['team1', 'team2'] });
        if (!match?.team1 || !match.team2 || match.reported_by_team_id == null) return;

        const reporter = match.reported_by_team_id === match.team1.id ? match.team1 : match.team2;
        const opponent = reporter.id === match.team1.id ? match.team2 : match.team1;
        const score = `${match.team1.name} ${match.team1_score} - ${match.team2_score} ${match.team2.name}`;
        const tournament = await this.tournamentName(match.tournament_id);

        await this.sendAll(
            await this.teamAdminIds(opponent),
            'match_score_reported',
            `${reporter.name} reported ${score}${tournament}. Confirm or dispute it from the bracket.`,
            'Confirm the score',
            this.data(match, opponent.id),
        );
    }

    /** "Score disputed": every global admin. */
    async disputed(matchId: number): Promise<void> {
        const match = await this.matchRepo.findOne({ where: { id: matchId }, relations: ['team1', 'team2'] });
        if (!match) return;

        const admins = await this.userRepo.find({ where: { role: In([ADMIN_ROLE, SUPER_ADMIN_ROLE]) } });
        const tournament = await this.tournamentName(match.tournament_id);
        await this.sendAll(
            admins.map((u) => u.id),
            'match_disputed',
            `The score of ${match.team1?.name ?? 'TBD'} vs ${match.team2?.name ?? 'TBD'}${tournament} is disputed and needs an admin decision.`,
            'Score disputed',
            this.data(match, null),
        );
    }

    private async teamAdminIds(team: Team): Promise<number[]> {
        const rows = await this.adminRepo.findBy({ teamId: team.id });
        return [...new Set([team.captain_id, ...rows.map((r) => r.userId)])];
    }

    private async tournamentName(id: number | null): Promise<string> {
        if (!id) return '';
        const t = await this.tournamentRepo.findOne({ where: { id } });
        return t ? ` in ${t.name}` : '';
    }

    private data(match: Match, teamId: number | null) {
        return { matchId: match.id, tournamentId: match.tournament_id, teamId };
    }

    private async sendAll(
        userIds: number[],
        type: NotificationType,
        body: string,
        title: string,
        data: Record<string, unknown>,
    ): Promise<void> {
        for (const userId of new Set(userIds)) {
            try {
                await this.notifications.sendNotification(userId, type, body, title, data, NotificationDestination.BOTH);
            } catch (err) {
                this.logger.warn(`Could not notify user ${userId} (${type}): ${(err as Error)?.message ?? err}`);
            }
        }
    }
}
