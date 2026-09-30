import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LookingForTeam } from '../entities/looking-for-team.entity';
import { Team } from '../entities/team.entity';
import { Tournament } from '../../tournaments/entities/tournament.entity';
import { assertRegistrationOpen } from '../../tournaments/services/registration-window';
import { RealtimeService } from '../../realtime/realtime.service';
import { RealtimeEvents } from '../../realtime/realtime.events';

@Injectable()
export class LookingForTeamCommand {
    constructor(
        @InjectRepository(LookingForTeam) private lftRepo: Repository<LookingForTeam>,
        @InjectRepository(Team) private teamRepo: Repository<Team>,
        @InjectRepository(Tournament) private tournamentRepo: Repository<Tournament>,
        private readonly realtime: RealtimeService,
    ) {}

    /** Flags (or updates the note of) the user as looking for a team in this tournament. */
    async flag(tournamentId: number, userId: number, note?: string): Promise<LookingForTeam> {
        const tournament = await this.tournamentRepo.findOneBy({ id: tournamentId });
        if (!tournament) throw new NotFoundException('Tournament not found');
        assertRegistrationOpen(tournament);

        const alreadyOnTeam = await this.teamRepo.existsBy({
            tournament: { id: tournamentId },
            members: { id: userId },
        });
        if (alreadyOnTeam) {
            throw new BadRequestException('You already have a team in this tournament');
        }

        const existing = await this.lftRepo.findOneBy({ userId, tournamentId });
        const saved = existing
            ? await this.lftRepo.save(Object.assign(existing, { note: note ?? null }))
            : await this.lftRepo.save(this.lftRepo.create({ userId, tournamentId, note: note ?? null }));

        this.realtime.toTournament(tournamentId, RealtimeEvents.TOURNAMENT_UPDATED, { id: tournamentId, reason: 'looking_for_team_changed' });
        return saved;
    }

    async unflag(tournamentId: number, userId: number): Promise<{ message: string }> {
        await this.lftRepo.delete({ userId, tournamentId });
        this.realtime.toTournament(tournamentId, RealtimeEvents.TOURNAMENT_UPDATED, { id: tournamentId, reason: 'looking_for_team_changed' });
        return { message: 'Removed from the looking-for-team board' };
    }
}
