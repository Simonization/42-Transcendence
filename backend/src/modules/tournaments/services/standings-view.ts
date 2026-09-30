import { Match } from '../../matches/entities/match.entity';
import { Tournament } from '../entities/tournament.entity';
import { TournamentPhase } from '../entities/tournament-phase.entity';
import { GROUP_PHASE_TYPES } from './bracket-generator.service';
import { withdrawnTeamIds } from './bracket-engine.service';
import { computeGroupStandings, StandingRow } from './standings';

export interface PhaseStandingsView {
    phaseId: number;
    phaseOrder: number;
    type: string;
    /** How many teams per group go through (null for the last phase). */
    qualifiersPerGroup: number | null;
    groups: { index: number; label: string; rows: (StandingRow & { name: string })[] }[];
}

/**
 * Standings of every group / round-robin phase that has matches. `tournament` needs `teams`
 * loaded; `matchesOf` returns a phase's matches.
 */
export function buildStandingsView(
    tournament: Tournament,
    phases: TournamentPhase[],
    matchesOf: (phase: TournamentPhase) => Match[],
): PhaseStandingsView[] {
    const names = new Map((tournament.teams ?? []).map((t) => [t.id, t.name]));
    const seedOf = new Map<number, number>((tournament.seed_order ?? []).map((id, i) => [id, i + 1]));
    const lastOrder = Math.max(0, ...phases.map((p) => p.order));

    return [...phases]
        .sort((a, b) => a.order - b.order)
        .filter((p) => GROUP_PHASE_TYPES.includes(p.type))
        .map((phase) => ({ phase, matches: matchesOf(phase) }))
        .filter(({ matches }) => matches.length > 0)
        .map(({ phase, matches }) => ({
            phaseId: phase.id,
            phaseOrder: phase.order,
            type: phase.type,
            qualifiersPerGroup:
                phase.order === lastOrder
                    ? null
                    : phase.type === 'ROUND_ROBIN'
                      ? phase.teams_limit_end || 1
                      : phase.group_winners_count || 1,
            groups: computeGroupStandings(matches, seedOf, withdrawnTeamIds(matches)).map((g) => ({
                ...g,
                rows: g.rows.map((r) => ({ ...r, name: names.get(r.teamId) ?? `#${r.teamId}` })),
            })),
        }));
}
