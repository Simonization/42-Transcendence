import { ConflictException, Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Team, TeamStatus } from '../entities/team.entity';
import { TeamAdmin } from '../entities/team-admin.entity';
import { TeamInvitation } from '../entities/team-invitation.entity';
import { LookingForTeam } from '../entities/looking-for-team.entity';

/** A DRAFT team the joining user was pulled out of; `deleted` when they were its only member. */
export interface DepartedTeam {
    teamId: number;
    deleted: boolean;
}

/** What joining another team would do to one of the user's current DRAFT teams. */
export interface PlannedDeparture {
    teamId: number;
    teamName: string;
    /** The user captains it: captaincy passes to `successor`, or the team is deleted. */
    captain: boolean;
    /** The user is its only member, so the team is deleted. */
    deletes: boolean;
    /** Username of the member who would become captain. */
    successor: string | null;
}

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
    ): Promise<DepartedTeam[]> {
        const otherTeams = await this.otherTeams(manager, userId, tournamentId, newTeamId);

        const lockedElsewhere = otherTeams.find((t) => t.status === TeamStatus.LOCKED);
        if (lockedElsewhere) {
            throw new ConflictException(
                `You are already registered with team "${lockedElsewhere.name}" in this tournament. Leave it before joining another team.`,
            );
        }

        const departed: DepartedTeam[] = [];
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
                    departed.push({ teamId: otherTeam.id, deleted: true });
                    continue;
                }
            } else {
                otherTeam.members = others;
                await manager.save(otherTeam);
            }
            departed.push({ teamId: otherTeam.id, deleted: false });
        }
        return departed;
    }

    /**
     * Read-only: what `assertCanJoin` would do, for showing the user before they confirm.
     * `lockedElsewhere` is the name of the LOCKED team that would make joining fail.
     */
    async planJoin(
        manager: EntityManager,
        userId: number,
        tournamentId: number,
        newTeamId: number,
    ): Promise<{ lockedElsewhere: string | null; leaving: PlannedDeparture[] }> {
        const otherTeams = await this.otherTeams(manager, userId, tournamentId, newTeamId);
        const locked = otherTeams.find((t) => t.status === TeamStatus.LOCKED);
        if (locked) return { lockedElsewhere: locked.name, leaving: [] };
        return {
            lockedElsewhere: null,
            leaving: otherTeams.map((t) => {
                const others = t.members.filter((m) => m.id !== userId);
                const captain = t.captain_id === userId;
                return {
                    teamId: t.id,
                    teamName: t.name,
                    captain,
                    deletes: captain && others.length === 0,
                    successor: captain && others.length > 0 ? others[0].username : null,
                };
            }),
        };
    }

    /** The user's other teams in this tournament, with their members. */
    private otherTeams(manager: EntityManager, userId: number, tournamentId: number, newTeamId: number): Promise<Team[]> {
        return manager
            .createQueryBuilder(Team, 'team')
            .innerJoin('team.members', 'member', 'member.id = :userId', { userId })
            .innerJoin('team.tournament', 'tournament', 'tournament.id = :tournamentId', { tournamentId })
            .leftJoinAndSelect('team.members', 'allMembers')
            .where('team.id != :newTeamId', { newTeamId })
            .getMany();
    }

    /** A user who just joined a team no longer needs to be on the looking-for-team board. */
    async clearLookingForTeam(manager: EntityManager, userId: number, tournamentId: number): Promise<void> {
        await manager.delete(LookingForTeam, { userId, tournamentId });
    }
}
