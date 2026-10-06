import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Team, TeamStatus } from '../entities/team.entity';
import { isRegistrationOpen } from '../../tournaments/services/registration-window';
import { PlannedDeparture, TeamMembershipService } from '../services/team-membership.service';
import { maxRosterSize, teamSizeOf } from '../utils/roster';

/** Why the code holder cannot join right now; null when they can. */
export type JoinBlocker =
    | 'already_member'
    | 'team_not_open'
    | 'registration_closed'
    | 'team_full'
    | 'locked_elsewhere';

export interface JoinPreview {
    teamName: string;
    tournamentId: number | null;
    tournamentName: string | null;
    memberCount: number;
    maxMembers: number;
    blocker: JoinBlocker | null;
    /** With `locked_elsewhere`: the LOCKED team the user would have to leave first. */
    lockedTeamName: string | null;
    /** The user's DRAFT teams in this tournament that joining would pull them out of. */
    leaving: PlannedDeparture[];
}

/**
 * What the holder of a join code sees before joining (POST /teams/join/preview). The code is
 * the credential: whoever has it may join, so they may see what they would join. Deliberately
 * no more than that: team and tournament names and the roster count, never the members, the
 * captain, the team id or the code's other uses. Changes nothing.
 */
@Injectable()
export class PreviewJoinCodeQuery {
    constructor(
        private readonly dataSource: DataSource,
        private readonly membership: TeamMembershipService,
    ) {}

    async execute(code: string, userId: number): Promise<JoinPreview> {
        const team = await this.dataSource.manager
            .createQueryBuilder(Team, 'team')
            .leftJoinAndSelect('team.members', 'members')
            .leftJoinAndSelect('team.tournament', 'tournament')
            .leftJoinAndSelect('tournament.phases', 'phases')
            .leftJoinAndSelect('phases.game', 'game')
            .where('team.join_code = :code', { code })
            .getOne();
        if (!team) throw new NotFoundException('Invalid join code');

        const tournament = team.tournament ?? null;
        const maxMembers = maxRosterSize(teamSizeOf(tournament));
        const members = team.members ?? [];

        let blocker: JoinBlocker | null = null;
        let lockedTeamName: string | null = null;
        let leaving: PlannedDeparture[] = [];

        if (members.some((m) => m.id === userId)) blocker = 'already_member';
        else if (team.status !== TeamStatus.DRAFT) blocker = 'team_not_open';
        else if (!tournament || !isRegistrationOpen(tournament)) blocker = 'registration_closed';
        else if (members.length >= maxMembers) blocker = 'team_full';
        else {
            const plan = await this.membership.planJoin(this.dataSource.manager, userId, tournament.id, team.id);
            if (plan.lockedElsewhere) {
                blocker = 'locked_elsewhere';
                lockedTeamName = plan.lockedElsewhere;
            }
            leaving = plan.leaving;
        }

        return {
            teamName: team.name,
            tournamentId: tournament?.id ?? null,
            tournamentName: tournament?.name ?? null,
            memberCount: members.length,
            maxMembers,
            blocker,
            lockedTeamName,
            leaving,
        };
    }
}
