import { Team } from '../../teams/entities/team.entity';
import { Tournament, TournamentStatus } from '../entities/tournament.entity';
import { GROUP_PHASE_TYPES } from './bracket-generator.service';
import { CheckinState, checkinRequired, checkinState } from './registration-window';
import { firstRoundPairs, orderEntrants, snakeGroups } from './seeding';

export interface SeededTeamView {
    id: number;
    name: string;
    status: string;
    seed: number;
    memberCount: number;
    checkedInAt: Date | null;
}

export interface SeedingView {
    tournamentId: number;
    /** True once the tournament has started: the seeding is then the one that was used. */
    started: boolean;
    phaseType: string | null;
    /** The teams that enter (or entered), seed 1 first. */
    teams: SeededTeamView[];
    /** Knockout first round as team ids, null for a bye. Empty for group phases. */
    pairs: [number | null, number | null][];
    /** Group phases: team ids per group (A, B, ...). Empty for knockout phases. */
    groups: number[][];
    /** Registered teams that would not enter because they are not LOCKED. */
    excluded: { id: number; name: string; status: string; reason: 'not_locked' | 'not_checked_in' }[];
    /** Check-in configuration, so the preview can say why a locked team is in `excluded`. */
    checkin: {
        state: CheckinState;
        opensAt: Date | null;
        /** True when start drops LOCKED teams that have not checked in. */
        required: boolean;
    };
}

/**
 * The seeding a tournament starts (or started) with, from the same functions the generator
 * uses. `tournament` needs its `teams` and `phases` loaded.
 */
export function buildSeedingView(tournament: Tournament): SeedingView {
    const teams: Team[] = tournament.teams ?? [];
    const started = tournament.status === TournamentStatus.ONGOING || tournament.status === TournamentStatus.COMPLETED;

    let entrants: Team[];
    if (started) {
        // Frozen at start; teams may have been archived since, so read the ids back as they are.
        const byId = new Map(teams.map((t) => [t.id, t]));
        entrants = (tournament.seed_order ?? []).map((id) => byId.get(id)).filter((t): t is Team => !!t);
    } else {
        entrants = orderEntrants(teams, tournament.seed_order, checkinRequired(tournament));
    }
    const entered = new Set(entrants.map((t) => t.id));

    const phase1 = [...(tournament.phases ?? [])].sort((a, b) => a.order - b.order)[0] ?? null;
    const phaseType = phase1?.type ?? null;
    const isGroups = phaseType !== null && GROUP_PHASE_TYPES.includes(phaseType);
    const ids = entrants.map((t) => t.id);

    let groups: number[][] = [];
    if (isGroups) {
        const size = phaseType === 'ROUND_ROBIN' ? Math.max(2, ids.length) : phase1?.group_size || 4;
        groups = ids.length ? snakeGroups(ids, size) : [];
    }

    return {
        tournamentId: tournament.id,
        started,
        phaseType,
        teams: entrants.map((t, i) => ({
            id: t.id,
            name: t.name,
            status: t.status,
            seed: i + 1,
            memberCount: t.members?.length ?? 0,
            checkedInAt: t.checked_in_at ?? null,
        })),
        pairs:
            isGroups || !ids.length
                ? []
                : firstRoundPairs(ids.length).map(([a, b]) => [a === null ? null : ids[a], b === null ? null : ids[b]]),
        groups,
        excluded: started
            ? []
            : teams
                  .filter((t) => !entered.has(t.id))
                  .sort((a, b) => a.id - b.id)
                  .map((t) => ({
                      id: t.id,
                      name: t.name,
                      status: t.status,
                      reason: t.status === 'LOCKED' ? ('not_checked_in' as const) : ('not_locked' as const),
                  })),
        checkin: {
            state: checkinState(tournament),
            opensAt: tournament.checkin_opens_at ?? null,
            required: !started && checkinRequired(tournament),
        },
    };
}
