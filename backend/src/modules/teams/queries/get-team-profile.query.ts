import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Team } from '../entities/team.entity';
import { Tournament } from '../../tournaments/entities/tournament.entity';
import { GROUP_PHASE_TYPES } from '../../tournaments/services/bracket-generator.service';
import { buildStandingsView } from '../../tournaments/services/standings-view';
import { computePodium, Placement, placementOf } from '../../tournaments/public/podium';
import { maxRosterSize, orderRoster, substituteIds, teamSizeOf } from '../utils/roster';

export interface TeamProfileMember {
    id: number;
    username: string;
    avatarUrl: string | null;
    isCaptain: boolean;
    isSubstitute: boolean;
}

export interface TeamProfileMatch {
    id: number;
    status: string;
    /** `group` = round-robin / group matchday, `knockout` = tree round. */
    stage: 'group' | 'knockout';
    /** 1-based round (knockout) or matchday (group). */
    round: number;
    /** Rounds in the knockout tree; equals `round` for the final. 0 for group matches. */
    rounds: number;
    opponent: { id: number; name: string } | null;
    /** From this team's point of view. */
    score: { for: number; against: number } | null;
    result: 'W' | 'L' | null;
    walkover: boolean;
    finishedAt: Date | null;
}

export interface TeamProfile {
    id: number;
    name: string;
    status: string;
    tournament: { id: number; name: string; status: string } | null;
    teamSize: number;
    maxMembers: number;
    members: TeamProfileMember[];
    placement: Placement | null;
    podium: { first: string; second: string | null; third: string[] } | null;
    matches: TeamProfileMatch[];
}

/**
 * A team's page: roster (username and avatar only, never emails), tournament, the matches it
 * played and where it finished. Open to any logged-in user, like the bracket it links from.
 */
@Injectable()
export class GetTeamProfileQuery {
    constructor(
        @InjectRepository(Team) private teamRepo: Repository<Team>,
        @InjectRepository(Tournament) private tournamentRepo: Repository<Tournament>,
    ) {}

    async execute(teamId: number): Promise<TeamProfile> {
        const team = await this.teamRepo.findOne({
            where: { id: teamId },
            relations: ['members', 'tournament', 'tournament.phases', 'tournament.phases.game'],
        });
        if (!team) throw new NotFoundException('Team not found');

        const teamSize = teamSizeOf(team.tournament);
        const subs = substituteIds(team.members ?? [], team.captain_id, teamSize);
        const members: TeamProfileMember[] = orderRoster(team.members ?? [], team.captain_id).map((m) => ({
            id: m.id,
            username: m.username,
            avatarUrl: m.avatarUrl ?? null,
            isCaptain: m.id === team.captain_id,
            isSubstitute: subs.has(m.id),
        }));

        const base = {
            id: team.id,
            name: team.name,
            status: team.status,
            teamSize,
            maxMembers: maxRosterSize(teamSize),
            members,
        };
        if (!team.tournament) {
            return { ...base, tournament: null, placement: null, podium: null, matches: [] };
        }

        const tournament = await this.tournamentRepo.findOne({
            where: { id: team.tournament.id },
            relations: ['phases', 'phases.matches', 'phases.matches.team1', 'phases.matches.team2', 'teams'],
        });
        const phases = [...(tournament?.phases ?? [])].sort((a, b) => a.order - b.order);

        const matches: TeamProfileMatch[] = [];
        for (const phase of phases) {
            const isGroup = GROUP_PHASE_TYPES.includes(phase.type);
            const all = phase.matches ?? [];
            const rounds = isGroup ? 0 : Math.max(0, ...all.map((m) => m.round_order ?? 1));
            for (const m of all) {
                if (m.team1_id !== team.id && m.team2_id !== team.id) continue;
                // Byes and matches still waiting for an opponent are not results (or fixtures).
                if (m.status === 'BYE' || m.status === 'WAITING') continue;
                const first = m.team1_id === team.id;
                const opponent = first ? m.team2 : m.team1;
                const mine = first ? m.team1_score : m.team2_score;
                const theirs = first ? m.team2_score : m.team1_score;
                matches.push({
                    id: m.id,
                    status: m.status,
                    stage: isGroup ? 'group' : 'knockout',
                    round: m.round_order ?? 1,
                    rounds,
                    opponent: opponent ? { id: opponent.id, name: opponent.name } : null,
                    score: mine != null && theirs != null ? { for: mine, against: theirs } : null,
                    result: m.status === 'FINISHED' && m.winner_id != null ? (m.winner_id === team.id ? 'W' : 'L') : null,
                    walkover: m.game_data?.walkover === true,
                    finishedAt: m.finished_at ?? null,
                });
            }
        }
        matches.sort((a, b) => a.id - b.id);

        const names = new Map((tournament?.teams ?? []).map((t) => [t.id, t.name]));
        const standings = tournament
            ? buildStandingsView(tournament, phases, (p) => p.matches ?? [])
            : [];
        const podium = tournament
            ? computePodium(
                  {
                      status: tournament.status,
                      phases: phases.map((p) => ({ order: p.order, type: p.type, matches: p.matches ?? [] })),
                      standings,
                      seedOrder: tournament.seed_order,
                  },
                  (id) => names.get(id) ?? `#${id}`,
              )
            : null;

        return {
            ...base,
            tournament: { id: team.tournament.id, name: team.tournament.name, status: team.tournament.status },
            placement: placementOf(team.tournament.status, podium, team.id),
            podium: podium
                ? { first: podium.first.name, second: podium.second?.name ?? null, third: podium.third.map((t) => t.name) }
                : null,
            matches,
        };
    }
}
