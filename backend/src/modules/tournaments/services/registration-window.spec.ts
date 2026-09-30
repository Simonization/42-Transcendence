import { BadRequestException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { TournamentStatus } from '../entities/tournament.entity';
import { CreateTournamentDto } from '../dto/create-tournament.dto';
import { UpdateTournamentDto } from '../dto/update-tournament.dto';
import { UpdateTournamentCommand } from '../commands/update-tournament.command';
import { CreateTournamentCommand } from '../commands/create-tournament.command';
import {
    assertRegistrationOpen,
    assertScheduleOrder,
    checkinRequired,
    checkinState,
    isRegistrationOpen,
} from './registration-window';

const NOW = new Date('2027-01-10T12:00:00Z');
const at = (h: number) => new Date(NOW.getTime() + h * 3_600_000);
const OPEN = TournamentStatus.REGISTRATION_OPEN;

describe('isRegistrationOpen', () => {
    it('is open with no deadline, and before the deadline', () => {
        expect(isRegistrationOpen({ status: OPEN }, NOW)).toBe(true);
        expect(isRegistrationOpen({ status: OPEN, registration_closes_at: null }, NOW)).toBe(true);
        expect(isRegistrationOpen({ status: OPEN, registration_closes_at: at(1) }, NOW)).toBe(true);
    });

    it('is closed at and after the deadline, even though the status is still open', () => {
        expect(isRegistrationOpen({ status: OPEN, registration_closes_at: NOW }, NOW)).toBe(false);
        expect(isRegistrationOpen({ status: OPEN, registration_closes_at: at(-1) }, NOW)).toBe(false);
    });

    it('accepts ISO strings (a tournament read back from JSON)', () => {
        expect(isRegistrationOpen({ status: OPEN, registration_closes_at: at(-1).toISOString() }, NOW)).toBe(false);
    });

    it.each([TournamentStatus.DRAFT, TournamentStatus.ONGOING, TournamentStatus.COMPLETED])(
        'is closed when the status is %s, whatever the deadline',
        (status) => {
            expect(isRegistrationOpen({ status, registration_closes_at: at(5) }, NOW)).toBe(false);
        },
    );

    it('assertRegistrationOpen throws a 400 and tolerates a missing tournament', () => {
        expect(() => assertRegistrationOpen({ status: OPEN }, undefined, NOW)).not.toThrow();
        expect(() => assertRegistrationOpen({ status: OPEN, registration_closes_at: at(-1) }, undefined, NOW))
            .toThrow(BadRequestException);
        expect(() => assertRegistrationOpen(null)).toThrow(BadRequestException);
    });
});

describe('check-in window', () => {
    it('is off without checkin_opens_at', () => {
        expect(checkinState({ status: OPEN }, NOW)).toBe('off');
        expect(checkinRequired({ status: OPEN }, NOW)).toBe(false);
    });

    it('is upcoming, then open, then closed once the tournament starts', () => {
        expect(checkinState({ status: OPEN, checkin_opens_at: at(1) }, NOW)).toBe('upcoming');
        expect(checkinState({ status: OPEN, checkin_opens_at: NOW }, NOW)).toBe('open');
        expect(checkinState({ status: TournamentStatus.ONGOING, checkin_opens_at: at(-1) }, NOW)).toBe('closed');
    });

    it('only filters the field once the window has opened', () => {
        expect(checkinRequired({ status: OPEN, checkin_opens_at: at(1) }, NOW)).toBe(false);
        expect(checkinRequired({ status: OPEN, checkin_opens_at: at(-1) }, NOW)).toBe(true);
    });
});

describe('schedule ordering', () => {
    it('accepts a deadline and a check-in at or before the start, or no start at all', () => {
        expect(() => assertScheduleOrder({ scheduledAt: at(5), registrationClosesAt: at(5), checkinOpensAt: at(2) })).not.toThrow();
        expect(() => assertScheduleOrder({ registrationClosesAt: at(50) })).not.toThrow();
        expect(() => assertScheduleOrder({ scheduledAt: null, registrationClosesAt: at(50) })).not.toThrow();
    });

    it('refuses a deadline or a check-in after the start', () => {
        expect(() => assertScheduleOrder({ scheduledAt: at(5), registrationClosesAt: at(6) })).toThrow(/registration_closes_at/);
        expect(() => assertScheduleOrder({ scheduledAt: at(5), checkinOpensAt: at(6) })).toThrow(/checkin_opens_at/);
    });
});

describe('tournament DTO validation', () => {
    const check = async (extra: object) =>
        validate(plainToInstance(CreateTournamentDto, { name: 'Cup', phases: [], ...extra }));

    it('accepts registration_closes_at on or before scheduled_at', async () => {
        expect(await check({ scheduled_at: '2027-02-01T18:00:00Z', registration_closes_at: '2027-02-01T12:00:00Z' })).toHaveLength(0);
        expect(await check({ scheduled_at: '2027-02-01T18:00:00Z', registration_closes_at: '2027-02-01T18:00:00Z' })).toHaveLength(0);
    });

    it('rejects registration_closes_at after scheduled_at', async () => {
        const errors = await check({ scheduled_at: '2027-02-01T18:00:00Z', registration_closes_at: '2027-02-02T00:00:00Z' });
        expect(errors.map((e) => e.property)).toEqual(['registration_closes_at']);
    });

    it('rejects checkin_opens_at after scheduled_at, and non-dates', async () => {
        expect((await check({ scheduled_at: '2027-02-01T18:00:00Z', checkin_opens_at: '2027-02-02T00:00:00Z' })).map((e) => e.property))
            .toEqual(['checkin_opens_at']);
        expect((await check({ registration_closes_at: 'soon' })).map((e) => e.property)).toEqual(['registration_closes_at']);
    });

    it('accepts null to clear a date, and leaves both optional', async () => {
        expect(await check({ registration_closes_at: null, checkin_opens_at: null, scheduled_at: null })).toHaveLength(0);
        expect(await check({})).toHaveLength(0);
    });

    it('applies to updates too (PartialType keeps the decorators)', async () => {
        const errors = await validate(
            plainToInstance(UpdateTournamentDto, { scheduled_at: '2027-02-01T18:00:00Z', registration_closes_at: '2027-03-01T00:00:00Z' }),
        );
        expect(errors.map((e) => e.property)).toEqual(['registration_closes_at']);
    });
});

const publisherStub = () => ({ settingsChanged: jest.fn() }) as any;

describe('commands enforce the ordering', () => {
    it('create refuses a deadline after the start before touching the database', async () => {
        const dataSource: any = { createQueryRunner: jest.fn() };
        const command = new CreateTournamentCommand({} as any, {} as any, dataSource);
        await expect(
            command.execute({
                name: 'Cup', phases: [], scheduled_at: '2027-02-01T18:00:00Z', registration_closes_at: '2027-02-02T00:00:00Z',
            } as any),
        ).rejects.toBeInstanceOf(BadRequestException);
        expect(dataSource.createQueryRunner).not.toHaveBeenCalled();
    });

    it('update checks a lone deadline against the stored scheduledAt, and rolls back', async () => {
        const tournament: any = { id: 3, status: OPEN, scheduledAt: new Date('2027-02-01T18:00:00Z') };
        const runner: any = {
            connect: jest.fn(), startTransaction: jest.fn(), commitTransaction: jest.fn(), rollbackTransaction: jest.fn(),
            release: jest.fn(),
            manager: { findOne: jest.fn().mockResolvedValue(tournament), save: jest.fn() },
        };
        const command = new UpdateTournamentCommand({} as any, {} as any, { createQueryRunner: () => runner } as any, publisherStub());

        await expect(command.execute(3, { registration_closes_at: '2027-02-05T00:00:00Z' } as any))
            .rejects.toBeInstanceOf(BadRequestException);
        expect(runner.manager.save).not.toHaveBeenCalled();
        expect(runner.rollbackTransaction).toHaveBeenCalled();
    });

    it('update stores the new dates as Dates and null clears them', async () => {
        const tournament: any = { id: 3, status: OPEN, scheduledAt: new Date('2027-02-01T18:00:00Z'), registration_closes_at: at(1) };
        const runner: any = {
            connect: jest.fn(), startTransaction: jest.fn(), commitTransaction: jest.fn(), rollbackTransaction: jest.fn(),
            release: jest.fn(),
            manager: { findOne: jest.fn().mockResolvedValue(tournament), save: jest.fn() },
        };
        const repo: any = { findOne: jest.fn().mockResolvedValue(tournament) };
        const command = new UpdateTournamentCommand(repo, {} as any, { createQueryRunner: () => runner } as any, publisherStub());

        await command.execute(3, { checkin_opens_at: '2027-02-01T10:00:00Z', registration_closes_at: null } as any);

        expect(tournament.checkin_opens_at).toEqual(new Date('2027-02-01T10:00:00Z'));
        expect(tournament.registration_closes_at).toBeNull();
    });
});
