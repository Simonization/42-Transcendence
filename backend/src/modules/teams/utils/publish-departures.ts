import { RealtimeService } from '../../realtime/realtime.service';
import { RealtimeEvents } from '../../realtime/realtime.events';
import type { DepartedTeam } from '../services/team-membership.service';

/**
 * Joining a team pulls the user out of their other DRAFT teams in the tournament
 * (see TeamMembershipService.assertCanJoin). Those teams changed too: tell their members, and
 * the tournament when one disappeared. Call after the transaction has committed.
 */
export function publishDepartures(
    realtime: RealtimeService,
    tournamentId: number | undefined,
    userId: number,
    departed: DepartedTeam[] | undefined,
): void {
    for (const { teamId, deleted } of departed ?? []) {
        realtime.toTeam(teamId, RealtimeEvents.TEAM_UPDATED, {
            id: teamId,
            reason: deleted ? 'team_deleted' : 'member_left',
        });
        realtime.leaveTeamRoom(userId, teamId);
        if (deleted && tournamentId != null) {
            realtime.toTournament(tournamentId, RealtimeEvents.TOURNAMENT_UPDATED, {
                id: tournamentId,
                reason: 'team_deleted',
            });
        }
    }
}
