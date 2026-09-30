import { BadRequestException } from '@nestjs/common';
import { TournamentStatus } from '../entities/tournament.entity';

/**
 * The registration deadline and the check-in window, decided in one place.
 *
 * Closing is lazy: nothing flips the status when `registration_closes_at` passes, every check
 * simply asks `isRegistrationOpen`. So a deadline takes effect on the second it passes, with no
 * cron job that could be late or dead.
 *
 * Check-in model: `checkin_opens_at` (absolute time, nullable). Check-in is "configured" when it
 * is set. The window opens at that time and closes when the tournament starts (status leaves
 * REGISTRATION_OPEN); there is no separate end time, so an admin who starts a few minutes late
 * does not lock out teams that are still checking in.
 */

export interface RegistrationWindow {
    status: TournamentStatus | string;
    registration_closes_at?: Date | string | null;
    checkin_opens_at?: Date | string | null;
}

export type CheckinState = 'off' | 'upcoming' | 'open' | 'closed';

const toMs = (d: Date | string | null | undefined): number | null => {
    if (d === null || d === undefined) return null;
    const ms = new Date(d).getTime();
    return Number.isNaN(ms) ? null : ms;
};

/** True while teams may be created, joined, locked and unlocked in this tournament. */
export function isRegistrationOpen(t: RegistrationWindow, now: Date = new Date()): boolean {
    if (t.status !== TournamentStatus.REGISTRATION_OPEN) return false;
    const closes = toMs(t.registration_closes_at);
    return closes === null || now.getTime() < closes;
}

/** Throws the 400 every registration path shares when `isRegistrationOpen` is false. */
export function assertRegistrationOpen(
    t: RegistrationWindow | null | undefined,
    message = 'Tournament is not open for registration',
    now: Date = new Date(),
): void {
    if (!t || !isRegistrationOpen(t, now)) throw new BadRequestException(message);
}

/** off: no check-in configured. upcoming/open: before/inside the window. closed: tournament started. */
export function checkinState(t: RegistrationWindow, now: Date = new Date()): CheckinState {
    const opens = toMs(t.checkin_opens_at);
    if (opens === null) return 'off';
    if (t.status !== TournamentStatus.REGISTRATION_OPEN) return 'closed';
    return now.getTime() >= opens ? 'open' : 'upcoming';
}

/**
 * Whether start (and the seeding preview) drop LOCKED teams that did not check in. True from the
 * moment the window opens; before that nobody could have checked in, so the whole field stays.
 */
export function checkinRequired(t: RegistrationWindow, now: Date = new Date()): boolean {
    const state = checkinState(t, now);
    return state === 'open' || state === 'closed';
}

/** The three dates must be ordered: registration closes and check-in opens no later than the start. */
export function assertScheduleOrder(dates: {
    scheduledAt?: Date | string | null;
    registrationClosesAt?: Date | string | null;
    checkinOpensAt?: Date | string | null;
}): void {
    const start = toMs(dates.scheduledAt);
    if (start === null) return;
    const closes = toMs(dates.registrationClosesAt);
    if (closes !== null && closes > start) {
        throw new BadRequestException('registration_closes_at must not be after scheduled_at');
    }
    const checkin = toMs(dates.checkinOpensAt);
    if (checkin !== null && checkin > start) {
        throw new BadRequestException('checkin_opens_at must not be after scheduled_at');
    }
}
