import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Team, TeamStatus } from '../entities/team.entity';
import { Tournament } from '../../tournaments/entities/tournament.entity';
import { CheckinState, checkinState, isRegistrationOpen } from '../../tournaments/services/registration-window';

export interface TournamentAvailability {
    tournamentId: number;
    /** `max_participants`, or null when the tournament has no cap. */
    maxTeams: number | null;
    /** Teams that are LOCKED, i.e. actually registered. */
    lockedTeams: number;
    /** Registration spots left, or null when uncapped. */
    spotsLeft: number | null;
    /** True when no more team can lock in (cap reached) or registration is closed. */
    full: boolean;
    /** Status is REGISTRATION_OPEN and the deadline, if any, has not passed. */
    registrationOpen: boolean;
    /** Deadline after which registration is refused; null when there is none. */
    registrationClosesAt: Date | null;
    /** Check-in opening time; null when the tournament has no check-in. */
    checkinOpensAt: Date | null;
    /** off: no check-in; upcoming / open: around the window; closed: tournament started. */
    checkinState: CheckinState;
}

@Injectable()
export class GetTournamentAvailabilityQuery {
    constructor(
        @InjectRepository(Team) private teamRepo: Repository<Team>,
        @InjectRepository(Tournament) private tournamentRepo: Repository<Tournament>,
    ) {}

    async execute(tournamentId: number): Promise<TournamentAvailability> {
        const tournament = await this.tournamentRepo.findOneBy({ id: tournamentId });
        if (!tournament) throw new NotFoundException('Tournament not found');

        return this.compute(tournament);
    }

    async compute(tournament: Tournament): Promise<TournamentAvailability> {
        const lockedTeams = await this.teamRepo.count({
            where: { tournament: { id: tournament.id }, status: TeamStatus.LOCKED },
        });
        const maxTeams = tournament.max_participants ?? null;
        const spotsLeft = maxTeams === null ? null : Math.max(0, maxTeams - lockedTeams);
        const registrationOpen = isRegistrationOpen(tournament);

        return {
            tournamentId: tournament.id,
            maxTeams,
            lockedTeams,
            spotsLeft,
            full: spotsLeft === 0,
            registrationOpen,
            registrationClosesAt: tournament.registration_closes_at ?? null,
            checkinOpensAt: tournament.checkin_opens_at ?? null,
            checkinState: checkinState(tournament),
        };
    }
}
