import { BadRequestException } from '@nestjs/common';
import { RealtimeEvents } from '../../realtime/realtime.events';
import { mockRealtime } from '../../teams/testing/test-mocks-spec';
import { BracketPublisher } from '../services/bracket-publisher.service';
import { TournamentStatus } from '../entities/tournament.entity';
import { UpdateTournamentCommand } from './update-tournament.command';
import { DeleteTournamentCommand } from './delete-tournament.command';

function runner(tournament: any, teams: any[] = []) {
    return {
        connect: jest.fn(),
        startTransaction: jest.fn(),
        commitTransaction: jest.fn(),
        rollbackTransaction: jest.fn(),
        release: jest.fn(),
        manager: {
            findOne: jest.fn().mockResolvedValue(tournament),
            find: jest.fn().mockResolvedValue(teams),
            save: jest.fn(),
            delete: jest.fn(),
        },
    } as any;
}

const publisherOf = (realtime: any) => new BracketPublisher(realtime, {} as any, {} as any, {} as any);

describe('tournament edit and delete publish TOURNAMENT_UPDATED', () => {
    it('update tells the tournament room after the commit', async () => {
        const realtime = mockRealtime();
        const tournament: any = { id: 3, status: TournamentStatus.REGISTRATION_OPEN, scheduledAt: new Date('2027-02-01T18:00:00Z') };
        const r = runner(tournament);
        r.commitTransaction.mockImplementation(async () => {
            expect(realtime.toTournament).not.toHaveBeenCalled();
        });
        const repo: any = { findOne: jest.fn().mockResolvedValue(tournament) };
        const command = new UpdateTournamentCommand(repo, {} as any, { createQueryRunner: () => r } as any, publisherOf(realtime));

        await command.execute(3, { registration_closes_at: '2027-02-01T10:00:00Z' } as any);

        expect(realtime.toTournament).toHaveBeenCalledTimes(1);
        expect(realtime.toTournament).toHaveBeenCalledWith(3, RealtimeEvents.TOURNAMENT_UPDATED, { id: 3, reason: 'tournament_edited' });
    });

    it('update publishes nothing when the change is refused', async () => {
        const realtime = mockRealtime();
        const tournament: any = { id: 3, status: TournamentStatus.REGISTRATION_OPEN, scheduledAt: new Date('2027-02-01T18:00:00Z') };
        const command = new UpdateTournamentCommand(
            {} as any, {} as any, { createQueryRunner: () => runner(tournament) } as any, publisherOf(realtime),
        );

        await expect(command.execute(3, { registration_closes_at: '2027-03-01T00:00:00Z' } as any)).rejects.toBeInstanceOf(BadRequestException);
        expect(realtime.toTournament).not.toHaveBeenCalled();
    });

    it('delete tells the tournament room it is gone, after the commit', async () => {
        const realtime = mockRealtime();
        const r = runner({ id: 4 });
        const repo: any = { findOne: jest.fn().mockResolvedValue({ id: 4 }) };
        const command = new DeleteTournamentCommand(repo, { createQueryRunner: () => r } as any, publisherOf(realtime));

        await command.execute(4);

        expect(r.commitTransaction).toHaveBeenCalled();
        expect(realtime.toTournament).toHaveBeenCalledWith(4, RealtimeEvents.TOURNAMENT_UPDATED, { id: 4, reason: 'tournament_deleted' });
    });
});
