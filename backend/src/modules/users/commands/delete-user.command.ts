import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { User } from '../entities/user.entity';
import { Team, TeamStatus } from '../../teams/entities/team.entity';
import { TournamentStatus } from '../../tournaments/entities/tournament.entity';
import { teamSizeOf } from '../../teams/utils/roster';

/** What deleting an account did to the teams the user was in, for the realtime updates. */
export interface AccountDeletion {
    userId: number;
    /** Teams whose roster or captain changed. */
    updatedTeamIds: number[];
    /** DRAFT-stage teams the user was alone in, deleted with the account. */
    deletedTeamIds: number[];
    /** Teams kept for their history although nobody is left to captain them. */
    captainlessTeamIds: number[];
    /** Tournament of each updated or deleted team, to refresh its pages. */
    tournamentIds: number[];
}

/**
 * Deletes an account by anonymising it: the users row stays as a tombstone (so messages, match
 * rows and results keep pointing at something), every personal field is erased, and everything
 * that only made sense for a live account goes.
 *
 * Erased / removed: email, username (replaced by a unique placeholder that is never shown),
 * password hash, names, avatar, verification token, 2FA flag and code, admin role, ban; the
 * profile and settings rows, linked game accounts, refresh tokens, friendships and pending
 * friend requests, blocks either way, team invitations and join requests either way,
 * looking-for-team entries, organisation memberships, notifications to or about the user.
 *
 * Kept: the messages the user sent (shown as from a deleted user), chat participation, match
 * history and results, and roster places in teams whose tournament has started or that played
 * (so brackets, standings and podiums stay as they were).
 *
 * Teams, for each team the user is in:
 *  - their team-admin rights go;
 *  - a team still in registration (no tournament started, no match played) loses the member;
 *    a LOCKED one that drops below the game's team size goes back to DRAFT (and must check in
 *    again). If the user captained it, the captaincy passes to the longest-standing remaining
 *    member, team admins first; if nobody remains, the team is deleted;
 *  - a team with history keeps the user on its roster, and stays in its bracket. A captain
 *    hands over the same way; with nobody left, the team stays as a captainless shell (its
 *    captain is the tombstone, which cannot sign in, so nobody can edit it).
 *
 * One transaction; the caller disconnects the user's sockets and publishes the team updates
 * after it commits.
 */
@Injectable()
export class DeleteUserCommand {
    constructor(private readonly dataSource: DataSource) {}

    async execute(userId: number): Promise<AccountDeletion> {
        return this.dataSource.transaction(async (manager) => {
            const user = await manager.findOne(User, { where: { id: userId }, lock: { mode: 'pessimistic_write' } });
            if (!user || user.deletedAt) throw new NotFoundException(`User #${userId} not found`);

            const result: AccountDeletion = {
                userId,
                updatedTeamIds: [],
                deletedTeamIds: [],
                captainlessTeamIds: [],
                tournamentIds: [],
            };
            await this.leaveTeams(manager, userId, result);
            await this.eraseRelations(manager, userId);
            await this.eraseIdentity(manager, userId);
            return result;
        });
    }

    private async leaveTeams(manager: EntityManager, userId: number, result: AccountDeletion): Promise<void> {
        const rows: { id: number }[] = await manager.query(
            `SELECT "team_id" AS "id" FROM "team_members" WHERE "user_id" = $1
             UNION
             SELECT "id" FROM "teams" WHERE "captain_id" = $1
             ORDER BY "id"`,
            [userId],
        );

        for (const { id } of rows) {
            // Same lock as the join / lock paths, so a concurrent join cannot slip in between.
            const locked = await manager.findOne(Team, { where: { id }, lock: { mode: 'pessimistic_write' } });
            if (!locked) continue;
            const team = (await manager.findOne(Team, {
                where: { id },
                relations: ['tournament', 'tournament.phases', 'tournament.phases.game'],
            }))!;
            const tournamentId = team.tournament?.id ?? null;
            if (tournamentId != null && !result.tournamentIds.includes(tournamentId)) {
                result.tournamentIds.push(tournamentId);
            }

            await manager.query(`DELETE FROM "team_admins" WHERE "team_id" = $1 AND "user_id" = $2`, [id, userId]);

            const hasHistory = await this.hasHistory(manager, team);
            const remaining = await this.remainingMembers(manager, id, userId);
            const isCaptain = team.captain_id === userId;

            if (!hasHistory) {
                await manager.query(`DELETE FROM "team_members" WHERE "team_id" = $1 AND "user_id" = $2`, [id, userId]);
                if (isCaptain && remaining.length === 0) {
                    await this.deleteTeam(manager, id);
                    result.deletedTeamIds.push(id);
                    continue;
                }
                if (isCaptain) await this.handOver(manager, id, remaining);
                if (team.status === TeamStatus.LOCKED && remaining.length < teamSizeOf(team.tournament)) {
                    await manager.update(Team, { id }, { status: TeamStatus.DRAFT, checked_in_at: null });
                }
                result.updatedTeamIds.push(id);
                continue;
            }

            // A team with history keeps its roster as it played.
            if (isCaptain) {
                if (remaining.length) await this.handOver(manager, id, remaining);
                else result.captainlessTeamIds.push(id);
            }
            result.updatedTeamIds.push(id);
        }
    }

    /** Started tournament, or any match played or scheduled with this team. */
    private async hasHistory(manager: EntityManager, team: Team): Promise<boolean> {
        const status = team.tournament?.status;
        if (status === TournamentStatus.ONGOING || status === TournamentStatus.COMPLETED) return true;
        if (team.status === TeamStatus.ARCHIVED) return true;
        const [{ exists }] = await manager.query(
            `SELECT EXISTS (SELECT 1 FROM "matches" WHERE "team1_id" = $1 OR "team2_id" = $1) AS "exists"`,
            [team.id],
        );
        return exists;
    }

    /**
     * Live members other than the leaving user, in succession order: team admins first, then
     * everyone else, each by roster order (the order the team_members rows were written in,
     * the same order roster.ts uses for starters and substitutes).
     */
    private async remainingMembers(manager: EntityManager, teamId: number, userId: number): Promise<number[]> {
        const rows: { user_id: number }[] = await manager.query(
            `SELECT tm."user_id"
               FROM "team_members" tm
               JOIN "users" u ON u."id" = tm."user_id"
               LEFT JOIN "team_admins" ta ON ta."team_id" = tm."team_id" AND ta."user_id" = tm."user_id"
              WHERE tm."team_id" = $1 AND tm."user_id" <> $2 AND u."deleted_at" IS NULL
              ORDER BY (ta."id" IS NULL), tm.ctid`,
            [teamId, userId],
        );
        return rows.map((r) => r.user_id);
    }

    private async handOver(manager: EntityManager, teamId: number, successors: number[]): Promise<void> {
        const next = successors[0];
        await manager.update(Team, { id: teamId }, { captain_id: next });
        // The captain is implicitly an admin; an explicit row would be a dangling duplicate.
        await manager.query(`DELETE FROM "team_admins" WHERE "team_id" = $1 AND "user_id" = $2`, [teamId, next]);
    }

    private async deleteTeam(manager: EntityManager, teamId: number): Promise<void> {
        await manager.query(`DELETE FROM "team_invitations" WHERE "team_id" = $1`, [teamId]);
        await manager.query(`DELETE FROM "team_admins" WHERE "team_id" = $1`, [teamId]);
        await manager.query(`DELETE FROM "team_members" WHERE "team_id" = $1`, [teamId]);
        await manager.query(`DELETE FROM "teams" WHERE "id" = $1`, [teamId]);
    }

    private async eraseRelations(manager: EntityManager, userId: number): Promise<void> {
        const statements = [
            `DELETE FROM "friends" WHERE "user1" = $1 OR "user2" = $1`,
            `DELETE FROM "user_blocks" WHERE "blockerId" = $1 OR "blockedId" = $1`,
            `DELETE FROM "team_invitations" WHERE "sender_id" = $1 OR "receiver_id" = $1`,
            `DELETE FROM "looking_for_team" WHERE "user_id" = $1`,
            `DELETE FROM "notifications" WHERE "user_id" = $1 OR "actor_id" = $1`,
            `DELETE FROM "refresh_tokens" WHERE "userId" = $1 OR "user_id" = $1`,
            `DELETE FROM "user_game_accounts" WHERE "userId" = $1 OR "user_id" = $1`,
            `DELETE FROM "org_members" WHERE "user_id" = $1`,
            `DELETE FROM "user_profiles" WHERE "user_id" = $1`,
            `DELETE FROM "user_settings" WHERE "user_id" = $1`,
        ];
        for (const sql of statements) await manager.query(sql, [userId]);
    }

    private async eraseIdentity(manager: EntityManager, userId: number): Promise<void> {
        // Unique placeholders; never shown (public views blank a deleted user's name). The mail
        // is not an address, so no registration or email lookup can ever match it.
        let username = `deleted-user-${userId}`;
        const [{ taken }] = await manager.query(
            `SELECT EXISTS (SELECT 1 FROM "users" WHERE "username" = $1 AND "id" <> $2) AS "taken"`,
            [username, userId],
        );
        if (taken) username = `${username}-${Date.now().toString(36)}`;

        await manager.update(User, { id: userId }, {
            username,
            mail: `deleted-user-${userId}`,
            // Not a bcrypt hash: nothing compares equal to it.
            passwordHash: '!',
            role: 0,
            status: 0,
            banUntil: null,
            isEmailVerified: false,
            verificationToken: null,
            twoFactorEnabled: false,
            twoFactorCode: null,
            firstName: null,
            lastName: null,
            avatarUrl: null,
            deletedAt: new Date(),
        });
    }
}
