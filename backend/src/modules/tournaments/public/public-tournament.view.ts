/**
 * The public, anonymous view of a tournament.
 *
 * Everything here is an explicit whitelist: each object is built field by field from the entity,
 * never spread, so a column added to Tournament / Team / Match / User later is private until
 * someone chooses to list it below. What it deliberately leaves out: every user (members,
 * captains, admins, emails), team invite codes, draft teams, who reported a score, and any
 * free-form match data other than the walkover flag.
 */

import { Match } from '../../matches/entities/match.entity';
import { Team, TeamStatus } from '../../teams/entities/team.entity';
import { Tournament } from '../entities/tournament.entity';
import { TournamentPhase } from '../entities/tournament-phase.entity';
import { buildSeedingView, SeedingView } from '../services/seeding-view';
import { buildStandingsView, PhaseStandingsView } from '../services/standings-view';
import { computePodium, Podium } from './podium';

export interface PublicMatch {
    id: number;
    phase_id: number;
    round_order: number | null;
    group_index: number | null;
    status: string;
    team1_id: number | null;
    team2_id: number | null;
    team1: { id: number; name: string } | null;
    team2: { id: number; name: string } | null;
    team1_score: number | null;
    team2_score: number | null;
    winner_id: number | null;
    score: string | null;
    winner_next_match_id: number | null;
    winner_next_match_slot: number | null;
    finished_at: Date | null;
    created_at: Date;
    /** The only `game_data` keys exposed: the walkover flag and the group label. */
    game_data: { walkover?: boolean; group?: string };
}

export interface PublicPhase {
    id: number;
    order: number;
    type: string;
    game_id: number;
    game: { id: number; name: string; teamSize: number; teamCount: number } | null;
    teams_limit_start: number | null;
    teams_limit_end: number | null;
    swiss_rounds: number | null;
    group_size: number | null;
    group_winners_count: number | null;
    matches: PublicMatch[];
}

export interface PublicTeam {
    id: number;
    name: string;
    status: string;
}

export interface PublicTournament {
    id: number;
    name: string;
    description: string | null;
    status: string;
    max_participants: number | null;
    scheduledAt: Date | null;
    finished_at: Date | null;
    createdAt: Date;
    seed_order: number[] | null;
    phases: PublicPhase[];
    /** Teams that are (or were) in the field: LOCKED or ARCHIVED. Draft teams are never listed. */
    teams: PublicTeam[];
    seeding: SeedingView;
    standings: PhaseStandingsView[];
    /** Only once the tournament is COMPLETED. */
    podium: Podium | null;
}

/** Teams that entered the field. A draft team is still being put together, so it stays private. */
const isPublicTeam = (t: Team) => t.status === TeamStatus.LOCKED || t.status === TeamStatus.ARCHIVED;

function publicMatch(m: Match): PublicMatch {
    const data = m.game_data ?? {};
    const gameData: PublicMatch['game_data'] = {};
    if (data.walkover === true) gameData.walkover = true;
    if (typeof data.group === 'string' && data.group.length === 1) gameData.group = data.group;
    return {
        id: m.id,
        phase_id: m.phase_id,
        round_order: m.round_order ?? null,
        group_index: m.group_index ?? null,
        status: m.status,
        team1_id: m.team1_id ?? null,
        team2_id: m.team2_id ?? null,
        team1: m.team1 ? { id: m.team1.id, name: m.team1.name } : null,
        team2: m.team2 ? { id: m.team2.id, name: m.team2.name } : null,
        team1_score: m.team1_score ?? null,
        team2_score: m.team2_score ?? null,
        winner_id: m.winner_id ?? null,
        score: m.score ?? null,
        winner_next_match_id: m.winner_next_match_id ?? null,
        winner_next_match_slot: m.winner_next_match_slot ?? null,
        finished_at: m.finished_at ?? null,
        created_at: m.created_at,
        game_data: gameData,
    };
}

function publicPhase(p: TournamentPhase): PublicPhase {
    return {
        id: p.id,
        order: p.order,
        type: p.type,
        game_id: p.game_id,
        game: p.game
            ? { id: p.game.id, name: p.game.name, teamSize: p.game.teamSize, teamCount: p.game.teamCount }
            : null,
        teams_limit_start: p.teams_limit_start ?? null,
        teams_limit_end: p.teams_limit_end ?? null,
        swiss_rounds: p.swiss_rounds ?? null,
        group_size: p.group_size ?? null,
        group_winners_count: p.group_winners_count ?? null,
        matches: (p.matches ?? []).map(publicMatch),
    };
}

/** `tournament` needs `phases` (with `game` and `matches` + both teams) and `teams` loaded. */
export function buildPublicTournament(tournament: Tournament): PublicTournament {
    const teams = (tournament.teams ?? []).filter(isPublicTeam);
    // Seeding and standings read team names from `teams`, so hand them the public subset only.
    const scoped = { ...tournament, teams } as Tournament;
    const phases = tournament.phases ?? [];

    const standings = buildStandingsView(scoped, phases, (p) => p.matches ?? []);
    const names = new Map(teams.map((t) => [t.id, t.name]));
    const podium = computePodium(
        {
            status: tournament.status,
            phases: phases.map((p) => ({ order: p.order, type: p.type, matches: p.matches ?? [] })),
            standings,
            seedOrder: tournament.seed_order,
        },
        (id) => names.get(id) ?? `#${id}`,
    );

    return {
        id: tournament.id,
        name: tournament.name,
        description: tournament.description ?? null,
        status: tournament.status,
        max_participants: tournament.max_participants ?? null,
        scheduledAt: tournament.scheduledAt ?? null,
        finished_at: tournament.finished_at ?? null,
        createdAt: tournament.createdAt,
        seed_order: tournament.seed_order ?? null,
        phases: phases.map(publicPhase),
        teams: teams.map((t) => ({ id: t.id, name: t.name, status: t.status })),
        seeding: buildSeedingView(scoped),
        standings,
        podium,
    };
}
