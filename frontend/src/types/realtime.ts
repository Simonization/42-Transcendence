/**
 * Realtime event names and channels. Mirrors backend/src/modules/realtime/realtime.events.ts:
 * keep the two in step. Payloads are minimal on purpose; on receiving an event, refetch the
 * resource through the normal API instead of trusting the pushed copy.
 */

export const RealtimeEvents = {
  /** A team's roster, status or name changed. Room: team:<id>. */
  TEAM_UPDATED: 'team:updated',
  /** A tournament's settings, status or registrations changed. Room: tournament:<id>. */
  TOURNAMENT_UPDATED: 'tournament:updated',
  /** The bracket moved (started, match finished, team advanced). Room: tournament:<id>. */
  BRACKET_UPDATED: 'bracket:updated',
  /** One match changed (score reported, confirmed, status). Room: match:<id>. */
  MATCH_UPDATED: 'match:updated',
  /** The current user was invited to a team. Delivered to the personal user: room. */
  INVITATION_RECEIVED: 'invitation:received',
} as const

export type RealtimeEventName = (typeof RealtimeEvents)[keyof typeof RealtimeEvents]

export interface RealtimePayload {
  /** Id of the resource the event is about. */
  id?: number
  /** Short machine-readable cause, e.g. 'member_joined', 'match_finished'. */
  reason?: string
  [key: string]: unknown
}

/** Rooms a page can join with useLiveChannel. `team` requires membership, `match` a team member or admin. */
export type LiveChannel = 'tournament' | 'match' | 'team'

export type RealtimeHandler = (payload: RealtimePayload) => void
export type RealtimeHandlers = Partial<Record<string, RealtimeHandler>>
