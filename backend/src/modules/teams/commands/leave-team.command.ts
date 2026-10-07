import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Team, TeamStatus } from '../entities/team.entity';
import { TeamAdmin } from '../entities/team-admin.entity';
import { Tournament, TournamentStatus } from '../../tournaments/entities/tournament.entity';
import { isRegistrationOpen } from '../../tournaments/services/registration-window';
import { teamSizeOf } from '../utils/roster';
import { RealtimeService } from '../../realtime/realtime.service';
import { RealtimeEvents } from '../../realtime/realtime.events';

export const LEAVE_LOCKED_AFTER_DEADLINE = 'LEAVE_LOCKED_AFTER_DEADLINE';

/**
 * A member (not the captain) leaves a team.
 *
 * Leaving a LOCKED team, the same rule as account deletion (DeleteUserCommand):
 *  - the remaining roster still has the game's team size (a substitute left): the team stays
 *    LOCKED and keeps its check-in;
 *  - it drops below the team size while registration is open: back to DRAFT (check-in cleared),
 *    the captain refills and locks again;
 *  - it would drop below the team size once registration has closed (deadline passed, not
 *    started): refused (403, LEAVE_LOCKED_AFTER_DEADLINE). Lock and unlock are closed then, so
 *    the team could never be locked again and would silently fall out of the bracket;
 *  - once the tournament started: refused.
 */
@Injectable()
export class LeaveTeamCommand {
    constructor(
        private dataSource: DataSource,
        private readonly realtime: RealtimeService,
    ) {}

    async execute(teamId: number, userId: number) {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            const manager = queryRunner.manager;
            // Tournament row first, then the team (the order lock-team and the bracket engine
            // use): the roster and the status cannot change under the checks below.
            const peek = await manager.findOne(Team, { where: { id: teamId }, relations: ['tournament'] });
            if (!peek) throw new NotFoundException('Team not found');
            if (peek.tournament?.id != null) {
                await manager.findOne(Tournament, { where: { id: peek.tournament.id }, lock: { mode: 'pessimistic_write' } });
            }
            await manager.findOne(Team, { where: { id: teamId }, lock: { mode: 'pessimistic_write' } });

            const team = await manager.findOne(Team, {
                where: { id: teamId },
                relations: ['members', 'tournament', 'tournament.phases', 'tournament.phases.game'],
            });

            if (!team) throw new NotFoundException('Team not found');
            if (team.captain_id === userId) {
                throw new ForbiddenException(
                    'The captain cannot leave — transfer captaincy or delete the team instead',
                );
            }

            const isMember = team.members.some((m) => m.id === userId);
            if (!isMember) throw new NotFoundException('You are not a member of this team');

            const remaining = team.members.filter((m) => m.id !== userId);
            const wasLocked = team.status === TeamStatus.LOCKED;
            const dropsBelowSize = remaining.length < teamSizeOf(team.tournament);

            if (wasLocked) {
                const tournamentStatus = team.tournament?.status;
                if (
                    tournamentStatus === TournamentStatus.ONGOING ||
                    tournamentStatus === TournamentStatus.COMPLETED
                ) {
                    throw new ForbiddenException(
                        'Cannot leave a locked team once the tournament has started',
                    );
                }
                if (dropsBelowSize && team.tournament && !isRegistrationOpen(team.tournament)) {
                    throw new ForbiddenException(
                        'Registration has closed: leaving would leave your locked team short of players, and it could not be locked again',
                        LEAVE_LOCKED_AFTER_DEADLINE,
                    );
                }
            }

            team.members = remaining;
            // Ex-members keep no rights over the team they left.
            await manager.delete(TeamAdmin, { teamId, userId });

            // A locked team short of starters is no longer registered: the captain must refill
            // and lock again (registration is open, checked above).
            const unlocked = wasLocked && dropsBelowSize;
            if (unlocked) {
                team.status = TeamStatus.DRAFT;
                team.checked_in_at = null;
            }

            await manager.save(team);

            await queryRunner.commitTransaction();

            this.realtime.toTeam(teamId, RealtimeEvents.TEAM_UPDATED, { id: teamId, reason: 'member_left' });
            this.realtime.leaveTeamRoom(userId, teamId);
            if (unlocked && team.tournament?.id) {
                this.realtime.toTournament(team.tournament.id, RealtimeEvents.TOURNAMENT_UPDATED, { id: team.tournament.id, reason: 'team_unlocked' });
            }
            return { message: 'Left team successfully' };

        } catch (err) {
            await queryRunner.rollbackTransaction();
            throw err;
        } finally {
            await queryRunner.release();
        }
    }
}
