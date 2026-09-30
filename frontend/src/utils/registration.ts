/**
 * Registration deadline and check-in state, mirrored from the backend so the page can tick a
 * countdown and flip to "closed" without a round trip. The server stays the authority: every
 * registration endpoint re-checks, so a wrong clock can only make a button look wrong.
 */

import { TournamentStatus } from '../types'
import type { CheckinState } from '../types/tournament'

export interface RegistrationInfo {
  status: TournamentStatus | string
  registration_closes_at?: string | null
}

export type RegistrationPhase = 'draft' | 'open' | 'closed' | 'ongoing' | 'completed'

/** Open while the status says so and the deadline, if any, has not passed. */
export function isRegistrationOpen(t: RegistrationInfo, now: number = Date.now()): boolean {
  if (t.status !== TournamentStatus.REGISTRATION_OPEN) return false
  if (!t.registration_closes_at) return true
  return now < new Date(t.registration_closes_at).getTime()
}

/** The state the tournament page shows: open, closed (deadline passed / not started), ongoing, completed. */
export function registrationPhase(t: RegistrationInfo, now: number = Date.now()): RegistrationPhase {
  if (t.status === TournamentStatus.ONGOING) return 'ongoing'
  if (t.status === TournamentStatus.COMPLETED) return 'completed'
  if (t.status === TournamentStatus.DRAFT) return 'draft'
  return isRegistrationOpen(t, now) ? 'open' : 'closed'
}

/** off: no check-in configured; upcoming / open: before / inside the window; closed: started. */
export function checkinStateOf(
  t: RegistrationInfo & { checkin_opens_at?: string | null },
  now: number = Date.now(),
): CheckinState {
  if (!t.checkin_opens_at) return 'off'
  if (t.status !== TournamentStatus.REGISTRATION_OPEN) return 'closed'
  return now >= new Date(t.checkin_opens_at).getTime() ? 'open' : 'upcoming'
}

export interface ScheduleValues {
  /** datetime-local strings ('' when unset) */
  scheduledAt: string
  registrationClosesAt: string
  checkinOpensAt: string
}

/**
 * Mirrors the backend rule: the deadline and the check-in opening must not be after the start.
 * Returns which field is wrong, or null. Only checked when a start is set.
 */
export function scheduleOrderError(v: ScheduleValues): 'registrationClosesAt' | 'checkinOpensAt' | null {
  if (!v.scheduledAt) return null
  const start = new Date(v.scheduledAt).getTime()
  if (v.registrationClosesAt && new Date(v.registrationClosesAt).getTime() > start) return 'registrationClosesAt'
  if (v.checkinOpensAt && new Date(v.checkinOpensAt).getTime() > start) return 'checkinOpensAt'
  return null
}

export interface CountdownParts {
  days: number
  hours: number
  minutes: number
  seconds: number
}

export function countdownParts(ms: number): CountdownParts {
  const total = Math.max(0, Math.floor(ms / 1000))
  return {
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  }
}

/**
 * Two most significant units: "2d 4h", "3h 12m", "12m 5s", "42s". `units` supplies the localized
 * suffixes so French ("2j 4h") and Turkish ("2g 4sa") read naturally.
 */
export function formatCountdown(
  ms: number,
  units: { d: string; h: string; m: string; s: string } = { d: 'd', h: 'h', m: 'm', s: 's' },
): string {
  const { days, hours, minutes, seconds } = countdownParts(ms)
  if (days > 0) return `${days}${units.d} ${hours}${units.h}`
  if (hours > 0) return `${hours}${units.h} ${minutes}${units.m}`
  if (minutes > 0) return `${minutes}${units.m} ${seconds}${units.s}`
  return `${seconds}${units.s}`
}
