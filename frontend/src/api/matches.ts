/**
 * Matches API
 * Match history, and the match-result loop (report, confirm, dispute; admin resolve and undo)
 */

import { api } from './index'
import type { BackendMatch, Match, MatchStats, MatchResult } from '../types'
import type { BackendMatch as BackendTournamentMatch, ReportScoreDto } from '../types/tournament'

const RESULT_MAP: Record<string, MatchResult> = {
  WIN: 'win',
  LOSS: 'loss',
  DRAW: 'draw',
}

/** Tournament match: find the user's side through the team slots. */
function fromTeamSlots(raw: BackendMatch, currentUserId: number): Match | null {
  const isMine = (team: BackendMatch['team1']) => !!team?.members?.some(m => m.id === currentUserId)
  const mineIs1 = isMine(raw.team1)
  if (!mineIs1 && !isMine(raw.team2)) return null
  if (raw.status !== 'FINISHED' || raw.winner_id == null) return null

  const mine = mineIs1 ? raw.team1! : raw.team2!
  const other = mineIs1 ? raw.team2 : raw.team1
  const myScore = mineIs1 ? raw.team1_score : raw.team2_score
  const theirScore = mineIs1 ? raw.team2_score : raw.team1_score

  return {
    id: raw.id,
    opponent: other?.name ?? 'Unknown',
    game: raw.game?.name ?? raw.phase?.game?.name ?? 'Unknown',
    result: raw.winner_id === mine.id ? 'win' : 'loss',
    date: raw.finished_at ?? raw.created_at,
    score: myScore != null && theirScore != null ? `${myScore} - ${theirScore}` : null,
    tournament: raw.phase?.tournament?.name ?? null,
  }
}

/**
 * Transform a backend match into a frontend match: tournament matches through their team slots,
 * legacy matches through userMatches. Unfinished matches are dropped.
 */
export function transformMatch(raw: BackendMatch, currentUserId: number): Match | null {
  if (raw.team1 || raw.team2) {
    const slotted = fromTeamSlots(raw, currentUserId)
    if (slotted || !raw.userMatches?.length) return slotted
  }

  const myEntry = raw.userMatches?.find(um => um.user_id === currentUserId)
  if (!myEntry || myEntry.result === 'PENDING') return null

  const opponentEntry = raw.userMatches.find(um => um.user_id !== currentUserId)

  return {
    id: raw.id,
    opponent: opponentEntry?.user?.username ?? 'Unknown',
    game: raw.game?.name ?? 'Unknown',
    result: RESULT_MAP[myEntry.result],
    date: raw.created_at,
  }
}

/**
 * Compute win/loss/draw stats from a list of matches
 */
export function computeStats(matches: Match[]): MatchStats {
  const wins = matches.filter(m => m.result === 'win').length
  const losses = matches.filter(m => m.result === 'loss').length
  const draws = matches.filter(m => m.result === 'draw').length
  const total = matches.length

  return {
    wins,
    losses,
    draws,
    totalMatches: total,
    winRate: total > 0 ? Math.round((wins / total) * 100) : 0,
  }
}

export const matchesApi = {
  /**
   * Get the current user's match history
   */
  getMyHistory(): Promise<BackendMatch[]> {
    return api<BackendMatch[]>('/matches/my-history')
  },

  /**
   * Get match history for a specific player
   */
  getPlayerHistory(userId: number): Promise<BackendMatch[]> {
    return api<BackendMatch[]>(`/matches/history/${userId}`)
  },

  /**
   * Get a single match by ID
   */
  getMatch(id: number): Promise<BackendMatch> {
    return api<BackendMatch>(`/matches/${id}`)
  },

  /** Captain / team admin of either team: report the score, in slot order. */
  report(id: number, scores: ReportScoreDto): Promise<BackendTournamentMatch> {
    return api<BackendTournamentMatch>(`/matches/${id}/report`, { method: 'POST', body: scores })
  },

  /** Captain / team admin of the other team: accept the reported score. */
  confirm(id: number): Promise<BackendTournamentMatch> {
    return api<BackendTournamentMatch>(`/matches/${id}/confirm`, { method: 'POST' })
  },

  /** Captain / team admin of the other team: reject the reported score. */
  dispute(id: number): Promise<BackendTournamentMatch> {
    return api<BackendTournamentMatch>(`/matches/${id}/dispute`, { method: 'POST' })
  },

  /** Member of either team: the group chat of this match (created if missing, joined if needed). */
  openChat(id: number): Promise<{ chatId: number }> {
    return api<{ chatId: number }>(`/matches/${id}/chat`, { method: 'POST' })
  },

  /** Global admin: set the final score. */
  resolve(id: number, scores: ReportScoreDto): Promise<BackendTournamentMatch> {
    return api<BackendTournamentMatch>(`/matches/${id}/resolve`, { method: 'POST', body: scores })
  },

  /** Global admin: revert a finished match. */
  undo(id: number): Promise<BackendTournamentMatch> {
    return api<BackendTournamentMatch>(`/matches/${id}/undo`, { method: 'POST' })
  },
}
