/**
 * Builds the bracket view-model from a tournament.
 *
 * Two sources, in priority order:
 *  - persisted matches, once an admin has started the tournament;
 *  - otherwise the backend's seeding (`tournament.seeding`, the same data as
 *    GET /tournaments/:id/seeding), so a team shows up the moment it locks, and the preview is
 *    exactly the bracket the start will generate. No seeding is computed here.
 */

import { i18n } from '../i18n'
import { PhaseType } from '../types'
import type {
  BackendTeam,
  BackendTournament,
  BracketMatch,
  BracketPlayer,
  BracketRound,
  BracketType,
  BracketMatchStatus,
  TournamentBracket,
} from '../types'
import type {
  BackendMatch,
  BackendPhase,
  BracketGroup,
  PhaseStandings,
  SeedingView,
} from '../types/tournament'

const t = (key: string, params: Record<string, unknown> = {}) => i18n.global.t(key, params)

const BYE: BracketPlayer = {
  id: 'bye',
  username: 'BYE',
  avatar: '—',
  rating: 0,
  seed: 0,
}

export const isBye = (p: BracketPlayer | null): boolean => p?.id === BYE.id

const GROUP_TYPES: string[] = [PhaseType.GROUP_STAGE, PhaseType.ROUND_ROBIN]
const isGroupPhase = (p: BackendPhase) => GROUP_TYPES.includes(p.type)

function bracketTypeOf(type: PhaseType | null | undefined): BracketType {
  if (type === PhaseType.DOUBLE_ELIMINATION) return 'double-elimination'
  if (type === PhaseType.ROUND_ROBIN) return 'round-robin'
  return 'single-elimination'
}

function toPlayer(team: Pick<BackendTeam, 'id' | 'name'> & Partial<BackendTeam>, seed: number): BracketPlayer {
  return {
    id: String(team.id),
    username: team.name,
    avatar: team.name.charAt(0).toUpperCase(),
    rating: team.members?.length ?? 0,
    seed,
    captainId: team.captain_id,
    adminIds: (team.admins ?? []).map(a => a.userId),
    memberIds: (team.members ?? []).map(m => m.id),
  }
}

function statusOf(match: BackendMatch): BracketMatchStatus {
  if (match.status === 'FINISHED' || match.status === 'BYE' || match.status === 'CANCELLED') return 'completed'
  if (match.status === 'ONGOING' || match.status === 'AWAITING_CONFIRMATION' || match.status === 'DISPUTED') {
    return 'live'
  }
  return 'upcoming'
}

/** Legacy rows carry only a score string such as "2-1". */
function splitScore(score: string | null): [number | null, number | null] {
  if (!score) return [null, null]
  const parts = score.split(/[-:]/).map(s => Number(s.trim()))
  if (parts.length !== 2 || parts.some(Number.isNaN)) return [null, null]
  return [parts[0], parts[1]]
}

function roundLabel(roundIndex: number, totalRounds: number): string {
  const fromEnd = totalRounds - roundIndex
  if (fromEnd === 1) return t('bracket.final')
  if (fromEnd === 2) return t('bracket.semiFinal')
  if (fromEnd === 3) return t('bracket.quarterFinal')
  return t('bracket.round', { n: roundIndex + 1 })
}

/** Team id -> seed: the seeding the tournament started with, else the admin's order. */
function seedMap(tournament: BackendTournament): Map<number, number> {
  const seeds = new Map<number, number>()
  const fromSeeding = tournament.seeding?.teams ?? []
  if (fromSeeding.length) fromSeeding.forEach(s => seeds.set(s.id, s.seed))
  else (tournament.seed_order ?? []).forEach((id, i) => seeds.set(id, i + 1))
  return seeds
}

function playerIndex(tournament: BackendTournament): (id: number | null, fallback?: BackendTeam | null) => BracketPlayer | null {
  const seeds = seedMap(tournament)
  const teams = new Map((tournament.teams ?? []).map(team => [team.id, team]))
  return (id, fallback) => {
    if (id == null) return null
    const team = teams.get(id) ?? fallback
    if (!team) return { id: String(id), username: `#${id}`, avatar: '#', rating: 0, seed: seeds.get(id) ?? 0 }
    return toPlayer(team, seeds.get(id) ?? 0)
  }
}

function toBracketMatch(
  m: BackendMatch,
  roundIndex: number,
  matchIndex: number,
  player: ReturnType<typeof playerIndex>,
): BracketMatch {
  const legacy = splitScore(m.score)
  const score1 = m.team1_score ?? legacy[0]
  const score2 = m.team2_score ?? legacy[1]
  let player2 = player(m.team2_id, m.team2)
  // A first-round bye has one team and nobody to play: show it as a BYE slot.
  if (m.status === 'BYE' && m.team2_id == null) player2 = BYE
  return {
    id: String(m.id),
    matchId: m.id,
    roundIndex,
    matchIndex,
    player1: player(m.team1_id, m.team1),
    player2,
    score1,
    score2,
    status: statusOf(m),
    state: m.status,
    winnerId: m.winner_id != null ? String(m.winner_id) : null,
    reportedByTeamId: m.reported_by_team_id != null ? String(m.reported_by_team_id) : null,
    walkover: m.game_data?.walkover === true,
    scheduledAt: m.created_at ?? '',
    completedAt: m.finished_at ?? null,
  }
}

/**
 * Orders each knockout round by position in the tree: the final is 0, and a match feeding slot
 * s of the match at position p sits at 2p + (s - 1). Falls back to id order without tree links.
 */
function treeOrder(matches: BackendMatch[]): Map<number, number> {
  const pos = new Map<number, number>()
  const rounds = [...new Set(matches.map(m => m.round_order ?? 1))].sort((a, b) => b - a)
  for (const round of rounds) {
    const inRound = matches.filter(m => (m.round_order ?? 1) === round).sort((a, b) => a.id - b.id)
    inRound.forEach((m, i) => {
      const parent = m.winner_next_match_id != null ? pos.get(m.winner_next_match_id) : undefined
      pos.set(m.id, parent !== undefined ? parent * 2 + ((m.winner_next_match_slot ?? 1) - 1) : i)
    })
  }
  return pos
}

function knockoutRounds(matches: BackendMatch[], player: ReturnType<typeof playerIndex>): BracketRound[] {
  const pos = treeOrder(matches)
  const byRound = new Map<number, BackendMatch[]>()
  for (const m of matches) {
    const round = m.round_order ?? 1
    byRound.set(round, [...(byRound.get(round) ?? []), m])
  }
  const ordered = [...byRound.keys()].sort((a, b) => a - b)
  return ordered.map((round, roundIndex) => ({
    label: roundLabel(roundIndex, ordered.length),
    matches: (byRound.get(round) ?? [])
      .sort((a, b) => (pos.get(a.id) ?? 0) - (pos.get(b.id) ?? 0) || a.id - b.id)
      .map((m, matchIndex) => toBracketMatch(m, roundIndex, matchIndex, player)),
  }))
}

function groupIndexOf(m: BackendMatch): number {
  if (m.group_index != null) return m.group_index
  const label = m.game_data?.group
  return typeof label === 'string' && label.length === 1 ? label.charCodeAt(0) - 65 : 0
}

function groupsFromMatches(
  matches: BackendMatch[],
  standings: PhaseStandings | undefined,
  player: ReturnType<typeof playerIndex>,
): BracketGroup[] {
  const byGroup = new Map<number, BackendMatch[]>()
  for (const m of matches) byGroup.set(groupIndexOf(m), [...(byGroup.get(groupIndexOf(m)) ?? []), m])

  return [...byGroup.keys()].sort((a, b) => a - b).map(index => {
    const groupMatches = byGroup.get(index)!
    const days = [...new Set(groupMatches.map(m => m.round_order ?? 1))].sort((a, b) => a - b)
    const table = standings?.groups.find(g => g.index === index)
    const teamIds = [...new Set(groupMatches.flatMap(m => [m.team1_id, m.team2_id]))]
    return {
      index,
      label: String.fromCharCode(65 + index),
      standings: table?.rows ?? [],
      players: teamIds.map(id => player(id)).filter((p): p is BracketPlayer => !!p),
      qualifiersPerGroup: standings?.qualifiersPerGroup ?? null,
      rounds: days.map((day, roundIndex) => ({
        label: t('bracket.matchday', { n: day }),
        matches: groupMatches
          .filter(m => (m.round_order ?? 1) === day)
          .sort((a, b) => a.id - b.id)
          .map((m, matchIndex) => toBracketMatch(m, roundIndex, matchIndex, player)),
      })),
    }
  })
}

function fromMatches(tournament: BackendTournament): TournamentBracket | null {
  const phases = [...(tournament.phases ?? [])].sort((a, b) => a.order - b.order)
  const played = phases.filter(p => (p.matches ?? []).length > 0)
  if (!played.length) return null

  const player = playerIndex(tournament)
  const groupPhase = played.find(isGroupPhase)
  const knockoutPhase = [...played].reverse().find(p => !isGroupPhase(p))

  const rounds = knockoutPhase ? knockoutRounds(knockoutPhase.matches, player) : []
  const groups = groupPhase
    ? groupsFromMatches(
        groupPhase.matches,
        tournament.standings?.find(s => s.phaseId === groupPhase.id),
        player,
      )
    : undefined

  let champion: BracketPlayer | null = null
  const final = rounds[rounds.length - 1]?.matches[0]
  if (final?.winnerId) {
    champion = [final.player1, final.player2].find(p => p?.id === final.winnerId) ?? null
  } else if (!knockoutPhase && tournament.status === 'COMPLETED' && groups?.length === 1) {
    const leader = groups[0].standings[0]
    champion = leader ? player(leader.teamId) : null
  }

  return {
    tournamentId: String(tournament.id),
    bracketType: bracketTypeOf((knockoutPhase ?? phases[0])?.type),
    rounds,
    groups,
    champion,
    provisional: false,
    completedAt: tournament.finished_at ?? null,
  }
}

/**
 * The preview before start, drawn from the backend's seeding: knockout pairs with their byes, or
 * the groups. Later rounds are placeholders until results exist.
 */
function fromSeeding(tournament: BackendTournament): TournamentBracket | null {
  const seeding: SeedingView | undefined = tournament.seeding
  if (!seeding || !seeding.teams.length) return null

  const teams = new Map((tournament.teams ?? []).map(team => [team.id, team]))
  const seeded = new Map(
    seeding.teams.map(s => [s.id, toPlayer({ ...(teams.get(s.id) ?? {}), id: s.id, name: s.name }, s.seed)]),
  )
  const slot = (id: number | null) => (id == null ? BYE : seeded.get(id) ?? null)
  const bracketType = bracketTypeOf(seeding.phaseType)

  if (seeding.groups.length) {
    return {
      tournamentId: String(tournament.id),
      bracketType,
      rounds: [],
      groups: seeding.groups.map((ids, index) => ({
        index,
        label: String.fromCharCode(65 + index),
        standings: [],
        players: ids.map(id => seeded.get(id)).filter((p): p is BracketPlayer => !!p),
        qualifiersPerGroup: null,
        rounds: [],
      })),
      champion: null,
      provisional: true,
    }
  }

  const totalRounds = Math.log2(seeding.pairs.length * 2)
  const rounds: BracketRound[] = []
  let matchesInRound = seeding.pairs.length
  for (let roundIndex = 0; roundIndex < totalRounds; roundIndex++) {
    const matches: BracketMatch[] = []
    const previous = rounds[roundIndex - 1]?.matches ?? []
    // A bye advances at start, so its team already shows in round 2 (slot 1 from the even feeder).
    const advanced = (m: BracketMatch | undefined) =>
      m && (isBye(m.player1) || isBye(m.player2)) ? getWinnerOfMatch(m) : null
    for (let matchIndex = 0; matchIndex < matchesInRound; matchIndex++) {
      const pair = roundIndex === 0 ? seeding.pairs[matchIndex] : null
      const p1 = pair ? slot(pair[0]) : advanced(previous[matchIndex * 2])
      const p2 = pair ? slot(pair[1]) : advanced(previous[matchIndex * 2 + 1])
      const bye = isBye(p1) || isBye(p2)
      matches.push({
        id: `provisional-${roundIndex}-${matchIndex}`,
        roundIndex,
        matchIndex,
        player1: p1,
        player2: p2,
        score1: null,
        score2: null,
        // A BYE pairing is already resolved, so show it as decided rather than upcoming.
        status: bye ? 'completed' : 'upcoming',
        winnerId: bye ? ((isBye(p1) ? p2 : p1)?.id ?? null) : null,
        scheduledAt: '',
        completedAt: null,
      })
    }
    rounds.push({ label: roundLabel(roundIndex, totalRounds), matches })
    matchesInRound /= 2
  }

  return {
    tournamentId: String(tournament.id),
    bracketType,
    rounds,
    champion: null,
    provisional: true,
  }
}

export function buildBracket(
  tournament: BackendTournament | null | undefined,
): TournamentBracket | null {
  if (!tournament) return null
  return fromMatches(tournament) ?? fromSeeding(tournament)
}

export function getWinnerOfMatch(match: BracketMatch): BracketPlayer | null {
  if (match.winnerId === match.player1?.id) return match.player1
  if (match.winnerId === match.player2?.id) return match.player2
  return null
}

/** Whether `userId` may act for a bracket team: its captain or one of its admins. */
export function canActFor(player: BracketPlayer | null, userId: number | null | undefined): boolean {
  if (!player || isBye(player) || userId == null) return false
  return player.captainId === userId || (player.adminIds ?? []).includes(userId)
}

/** Backend states in which a match has (or had) its chat room: both teams known and played. */
const CHAT_STATES = ['READY', 'ONGOING', 'AWAITING_CONFIRMATION', 'DISPUTED', 'FINISHED']

/** Whether `userId` is a member of either team of a persisted match and may open its chat. */
export function canOpenMatchChat(match: BracketMatch, userId: number | null | undefined): boolean {
  if (userId == null || !match.matchId || !match.state || !CHAT_STATES.includes(match.state)) return false
  if (match.walkover) return false
  return [match.player1, match.player2].some(p => !!p && !isBye(p) && (p.memberIds ?? []).includes(userId))
}

export interface MatchPermissions {
  /** READY: captain/admin of a team in the match. AWAITING: the reporting side may correct. */
  report: boolean
  /** AWAITING_CONFIRMATION: captain/admin of the team that did not report (and not the reporter). */
  confirm: boolean
  dispute: boolean
  /** Global admin, unsettled match with both teams. */
  resolve: boolean
  /** Global admin, finished (not bye) match. */
  undo: boolean
  /** Global admin, unsettled match: withdraw either team. */
  withdraw: boolean
}

/** What the current user may do on a match. Mirrors the backend's checks; the backend decides. */
export function matchPermissions(
  match: BracketMatch,
  userId: number | null | undefined,
  isGlobalAdmin: boolean,
  tournamentLive: boolean,
): MatchPermissions {
  const none = { report: false, confirm: false, dispute: false, resolve: false, undo: false, withdraw: false }
  if (!match.matchId || !match.state || !tournamentLive && match.state !== 'FINISHED') return none

  const both = !!match.player1 && !!match.player2 && !isBye(match.player1) && !isBye(match.player2)
  const act1 = canActFor(match.player1, userId)
  const act2 = canActFor(match.player2, userId)
  const reporter = match.reportedByTeamId
  const reporterIs1 = reporter != null && reporter === match.player1?.id
  const reporterIs2 = reporter != null && reporter === match.player2?.id
  const awaiting = match.state === 'AWAITING_CONFIRMATION'
  const opponentOk = awaiting && ((reporterIs1 && act2 && !act1) || (reporterIs2 && act1 && !act2))
  const unsettled = !['FINISHED', 'BYE', 'CANCELLED'].includes(match.state)

  return {
    report:
      both &&
      (((match.state === 'READY' || match.state === 'ONGOING') && (act1 || act2)) ||
        (awaiting && ((reporterIs1 && act1) || (reporterIs2 && act2)))),
    confirm: opponentOk,
    dispute: opponentOk,
    resolve: isGlobalAdmin && both && unsettled && tournamentLive,
    undo: isGlobalAdmin && match.state === 'FINISHED',
    withdraw: isGlobalAdmin && unsettled && tournamentLive && (!!match.player1 || !!match.player2),
  }
}
