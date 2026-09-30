import { ConflictException, Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Team, TeamStatus } from '../entities/team.entity';
import { TeamAdmin } from '../entities/team-admin.entity';
import { TeamInvitation } from '../entities/team-invitation.entity';
import { LookingForTeam } from '../entities/looking-for-team.entity';

/**
 * Shared "one team per user per tournament" enforcement, used by every path that puts a user
 * onto a team: accepting an invite, joining by code, and accepting a join request.
 */
@Injectable()
export class TeamMembershipService {
    /**
     * Must run inside the same transaction as the membership change it guards.
     *
     * If the user already belongs to a LOCKED team elsewhere in this tournament, throws a 409 —
     * they must leave it first. Otherwise, silently removes them from any DRAFT team(s) they
     * belong to in this tournament (transferring or deleting a solo-captained one), exactly like
     * switching drafts always worked.
     */
    async assertCanJoin(
        manager: EntityManager,
        userId: number,
        tournamentId: number,
        newTeamId: number,
    ): Promise<void> {
        const otherTeams = await manager
            .createQueryBuilder(Team, 'team')
            .innerJoin('team.members', 'member', 'member.id = :userId', { userId })
            .innerJoin('team.tournament', 'tournament', 'tournament.id = :tournamentId', { tournamentId })
            .leftJoinAndSelect('team.members', 'allMembers')
            .where('team.id != :newTeamId', { newTeamId })
            .getMany();

        const lockedElsewhere = otherTeams.find((t) => t.status === TeamStatus.LOCKED);
        if (lockedElsewhere) {
            throw new ConflictException(
                `You are already registered with team "${lockedElsewhere.name}" in this tournament. Leave it before joining another team.`,
            );
        }

        for (const otherTeam of otherTeams) {
            const others = otherTeam.members.filter((m) => m.id !== userId);
            await manager.delete(TeamAdmin, { teamId: otherTeam.id, userId });

            if (otherTeam.captain_id === userId) {
                if (others.length > 0) {
                    otherTeam.captain_id = others[0].id;
                    otherTeam.members = others;
                    // The new captain is implicitly an admin; drop any explicit row to avoid a
                    // dangling duplicate grant.
                    await manager.delete(TeamAdmin, { teamId: otherTeam.id, userId: others[0].id });
                    await manager.save(otherTeam);
                } else {
                    await manager.delete(TeamInvitation, { team_id: otherTeam.id });
                    otherTeam.members = [];
                    await manager.save(otherTeam);
                    await manager.delete(Team, { id: otherTeam.id });
                }
            } else {
                otherTeam.members = others;
                await manager.save(otherTeam);
            }
        }
    }

    /** A user who just joined a team no longer needs to be on the looking-for-team board. */
    async clearLookingForTeam(manager: EntityManager, userId: number, tournamentId: number): Promise<void> {
        await manager.delete(LookingForTeam, { userId, tournamentId });
    }
}
