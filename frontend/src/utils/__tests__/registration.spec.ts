import { describe, it, expect } from 'vitest'
import {
  checkinStateOf,
  countdownParts,
  formatCountdown,
  isRegistrationOpen,
  registrationPhase,
  scheduleOrderError,
} from '../registration'
import { toDisplayTournament } from '../tournamentMapper'
import type { BackendTournament } from '../../types'

const NOW = Date.parse('2027-01-10T12:00:00Z')
const at = (hours: number) => new Date(NOW + hours * 3_600_000).toISOString()

describe('isRegistrationOpen / registrationPhase', () => {
  it('is open with no deadline or a future one', () => {
    expect(isRegistrationOpen({ status: 'REGISTRATION_OPEN' }, NOW)).toBe(true)
    expect(isRegistrationOpen({ status: 'REGISTRATION_OPEN', registration_closes_at: at(1) }, NOW)).toBe(true)
    expect(registrationPhase({ status: 'REGISTRATION_OPEN', registration_closes_at: at(1) }, NOW)).toBe('open')
  })

  it('is closed at and after the deadline although the status is still open', () => {
    expect(isRegistrationOpen({ status: 'REGISTRATION_OPEN', registration_closes_at: at(0) }, NOW)).toBe(false)
    expect(registrationPhase({ status: 'REGISTRATION_OPEN', registration_closes_at: at(-1) }, NOW)).toBe('closed')
  })

  it('maps the other statuses to their own phase, whatever the deadline', () => {
    expect(registrationPhase({ status: 'ONGOING', registration_closes_at: at(5) }, NOW)).toBe('ongoing')
    expect(registrationPhase({ status: 'COMPLETED' }, NOW)).toBe('completed')
    expect(registrationPhase({ status: 'DRAFT' }, NOW)).toBe('draft')
    expect(isRegistrationOpen({ status: 'ONGOING' }, NOW)).toBe(false)
  })
})

describe('checkinStateOf', () => {
  it('is off without a check-in, then upcoming, open, closed', () => {
    expect(checkinStateOf({ status: 'REGISTRATION_OPEN' }, NOW)).toBe('off')
    expect(checkinStateOf({ status: 'REGISTRATION_OPEN', checkin_opens_at: at(1) }, NOW)).toBe('upcoming')
    expect(checkinStateOf({ status: 'REGISTRATION_OPEN', checkin_opens_at: at(0) }, NOW)).toBe('open')
    expect(checkinStateOf({ status: 'ONGOING', checkin_opens_at: at(-1) }, NOW)).toBe('closed')
  })
})

describe('formatCountdown', () => {
  it('shows the two most significant units', () => {
    expect(formatCountdown(((2 * 24 + 4) * 3600 + 59 * 60) * 1000)).toBe('2d 4h')
    expect(formatCountdown((3 * 3600 + 12 * 60 + 9) * 1000)).toBe('3h 12m')
    expect(formatCountdown((12 * 60 + 5) * 1000)).toBe('12m 5s')
    expect(formatCountdown(42_000)).toBe('42s')
  })

  it('uses the given unit suffixes and never goes negative', () => {
    expect(formatCountdown(((2 * 24 + 4) * 3600) * 1000, { d: 'j', h: 'h', m: 'min', s: 's' })).toBe('2j 4h')
    expect(formatCountdown(-5000)).toBe('0s')
    expect(countdownParts(90_061_000)).toEqual({ days: 1, hours: 1, minutes: 1, seconds: 1 })
  })
})

describe('scheduleOrderError', () => {
  const base = { scheduledAt: '2027-02-01T18:00', registrationClosesAt: '', checkinOpensAt: '' }

  it('accepts ordered dates and ignores everything without a start', () => {
    expect(scheduleOrderError({ ...base, registrationClosesAt: '2027-02-01T12:00', checkinOpensAt: '2027-02-01T17:00' })).toBeNull()
    expect(scheduleOrderError({ ...base, scheduledAt: '', registrationClosesAt: '2030-01-01T00:00' })).toBeNull()
  })

  it('names the field that is after the start', () => {
    expect(scheduleOrderError({ ...base, registrationClosesAt: '2027-02-02T00:00' })).toBe('registrationClosesAt')
    expect(scheduleOrderError({ ...base, checkinOpensAt: '2027-02-02T00:00' })).toBe('checkinOpensAt')
  })
})

describe('toDisplayTournament registrationOpen', () => {
  const backend = (over: Partial<BackendTournament>) =>
    ({ id: 1, name: 'Cup', description: null, max_participants: 8, phases: [], teams: [], createdAt: '2027-01-01T00:00:00Z', ...over }) as BackendTournament

  it('is false for DRAFT, ONGOING, COMPLETED and a passed deadline; true otherwise', () => {
    const open = toDisplayTournament(backend({ status: 'REGISTRATION_OPEN' as never }))
    const passed = toDisplayTournament(backend({ status: 'REGISTRATION_OPEN' as never, registration_closes_at: '2000-01-01T00:00:00Z' }))
    expect(open.registrationOpen).toBe(true)
    expect(passed.registrationOpen).toBe(false)
    for (const status of ['DRAFT', 'ONGOING', 'COMPLETED']) {
      expect(toDisplayTournament(backend({ status: status as never })).registrationOpen).toBe(false)
    }
  })
})
