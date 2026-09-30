/**
 * Public API: anonymous, read-only data for people without an account (the shareable bracket).
 */

import { api } from './index'
import type { BackendTournament } from '../types'

/** Same shape the bracket builder reads from GET /tournaments/:id, minus anything private. */
export type PublicTournament = BackendTournament

/** Where link unfurlers (Discord, Slack, ...) read the preview tags; humans are redirected on. */
export const shareUrl = (tournamentId: number): string => `${window.location.origin}/api/share/t/${tournamentId}`

/** The page a visitor lands on. */
export const publicPageUrl = (tournamentId: number): string => `${window.location.origin}/t/${tournamentId}`

export const publicApi = {
  getTournament(id: number): Promise<PublicTournament> {
    return api<PublicTournament>(`/public/tournaments/${id}`, { auth: false })
  },
}
