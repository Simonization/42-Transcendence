import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LookingForTeam } from '../entities/looking-for-team.entity';
import { Team } from '../entities/team.entity';
import { Tournament, TournamentStatus } from '../../tournaments/entities/tournament.entity';

@Injectable()
export class LookingForTeamCommand {
    constructor(
        @InjectRepository(LookingForTeam) private lftRepo: Repository<LookingForTeam>,
        @InjectRepository(Team) private teamRepo: Repository<Team>,
        @InjectRepository(Tournament) private tournamentRepo: Repository<Tournament>,
    ) {}

    /** Flags (or updates the note of) the user as looking for a team in this tournament. */
    async flag(tournamentId: number, userId: number, note?: string): Promise<LookingForTeam> {
        const tournament = await this.tournamentRepo.findOneBy({ id: tournamentId });
        if (!tournament) throw new NotFoundException('Tournament not found');
        if (tournament.status !== TournamentStatus.REGISTRATION_OPEN) {
            throw new BadRequestException('Tournament is not open for registration');
        }

        const alreadyOnTeam = await this.teamRepo.existsBy({
            tournament: { id: tournamentId },
            members: { id: userId },
        });
        if (alreadyOnTeam) {
            throw new BadRequestException('You already have a team in this tournament');
        }

        const existing = await this.lftRepo.findOneBy({ userId, tournamentId });
        if (existing) {
            existing.note = note ?? null;
            return await this.lftRepo.save(existing);
        }

        return await this.lftRepo.save(
            this.lftRepo.create({ userId, tournamentId, note: note ?? null }),
        );
    }

    async unflag(tournamentId: number, userId: number): Promise<{ message: string }> {
        await this.lftRepo.delete({ userId, tournamentId });
        return { message: 'Removed from the looking-for-team board' };
    }
}
