import type { Team } from '../teams/entities/team.entity';
import type { TeamAdmin } from '../teams/entities/team-admin.entity';
import type { TeamInvitation } from '../teams/entities/team-invitation.entity';
import type { LookingForTeam } from '../teams/entities/looking-for-team.entity';
import type { Match } from '../matches/entities/match.entity';
import type { UserMatch } from '../matches/entities/user-match.entity';
import type { Tournament } from '../tournaments/entities/tournament.entity';
import type { TournamentPhase } from '../tournaments/entities/tournament-phase.entity';
import { PublicUser, toPublicUser } from './public-user';

/**
 * Entity graphs as other players may see them: every embedded user goes through `toPublicUser`,
 * everything else is returned as it is. The read endpoints of the tournaments, teams and matches
 * modules wrap their result in one of these before it leaves the service, so a new relation in a
 * query cannot put an email or a role on the wire. Each function copies; none mutates its input
 * (the commands still need the real entities). The `@Column({ select: false })` fields (password
 * hash, tokens, `join_code`) are never loaded by these queries and are not touched here.
 */

export type PublicTeamAdmin = Omit<TeamAdmin, 'user' | 'team'> & { user?: PublicUser; team?: PublicTeam };

export type PublicTeam = Omit<Team, 'members' | 'captain' | 'admins' | 'tournament'> & {
    members?: PublicUser[];
    captain?: PublicUser;
    admins?: PublicTeamAdmin[];
    tournament?: PublicTournament;
};

export type PublicUserMatch = Omit<UserMatch, 'user' | 'match' | 'team'> & { user?: PublicUser; team?: PublicTeam };

export type PublicMatch = Omit<Match, 'team1' | 'team2' | 'userMatches' | 'phase'> & {
    team1?: PublicTeam | null;
    team2?: PublicTeam | null;
    userMatches?: PublicUserMatch[];
    phase?: PublicPhase;
};

export type PublicPhase = Omit<TournamentPhase, 'matches' | 'tournament'> & {
    matches?: PublicMatch[];
    tournament?: PublicTournament;
};

export type PublicTournament<T extends Tournament = Tournament> = Omit<T, 'teams' | 'phases'> & {
    teams?: PublicTeam[];
    phases?: PublicPhase[];
};

export type PublicInvitation = Omit<TeamInvitation, 'sender' | 'receiver' | 'team'> & {
    sender?: PublicUser;
    receiver?: PublicUser;
    team?: PublicTeam;
};

export type PublicLookingForTeam = Omit<LookingForTeam, 'user' | 'tournament'> & { user?: PublicUser; tournament?: PublicTournament };

// Each function touches only the relations that were loaded, so the shape of the response is the
// same as before minus the private user fields.

export function publicTeam(team: Team): PublicTeam {
    const out: Record<string, unknown> = { ...team };
    if (team.members) out.members = team.members.map(toPublicUser);
    if (team.captain) out.captain = toPublicUser(team.captain);
    if (team.admins) {
        out.admins = team.admins.map((a) => ({ ...a, ...(a.user ? { user: toPublicUser(a.user) } : {}) }));
    }
    if (team.tournament) out.tournament = publicTournament(team.tournament);
    return out as PublicTeam;
}

export function publicMatch(match: Match): PublicMatch {
    const out: Record<string, unknown> = { ...match };
    if (match.team1) out.team1 = publicTeam(match.team1);
    if (match.team2) out.team2 = publicTeam(match.team2);
    if (match.userMatches) {
        out.userMatches = match.userMatches.map((um) => ({
            ...um,
            ...(um.user ? { user: toPublicUser(um.user) } : {}),
            ...(um.team ? { team: publicTeam(um.team) } : {}),
        }));
    }
    if (match.phase) out.phase = publicPhase(match.phase);
    return out as PublicMatch;
}

export function publicPhase(phase: TournamentPhase): PublicPhase {
    const out: Record<string, unknown> = { ...phase };
    if (phase.matches) out.matches = phase.matches.map(publicMatch);
    if (phase.tournament) out.tournament = publicTournament(phase.tournament);
    return out as PublicPhase;
}

/** Keeps any extra fields of `t` (the details view adds `seeding`, `standings`, `podium`). */
export function publicTournament<T extends Tournament>(t: T): PublicTournament<T> {
    const out: Record<string, unknown> = { ...(t as Tournament) };
    if (t.teams) out.teams = t.teams.map(publicTeam);
    if (t.phases) out.phases = t.phases.map(publicPhase);
    return out as PublicTournament<T>;
}

export function publicInvitation(inv: TeamInvitation): PublicInvitation {
    const out: Record<string, unknown> = { ...inv };
    if (inv.sender) out.sender = toPublicUser(inv.sender);
    if (inv.receiver) out.receiver = toPublicUser(inv.receiver);
    if (inv.team) out.team = publicTeam(inv.team);
    return out as PublicInvitation;
}

export function publicLookingForTeam(entry: LookingForTeam): PublicLookingForTeam {
    const out: Record<string, unknown> = { ...entry };
    if (entry.user) out.user = toPublicUser(entry.user);
    if (entry.tournament) out.tournament = publicTournament(entry.tournament);
    return out as PublicLookingForTeam;
}
