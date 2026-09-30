import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tournament, TournamentStatus } from '../entities/tournament.entity';
import { TeamStatus } from '../../teams/entities/team.entity';
import { CheckinState, checkinRequired, checkinState } from '../services/registration-window';

export interface CheckinTeamView {
    id: number;
    name: string;
    checkedInAt: Date | null;
}

export interface CheckinView {
    tournamentId: number;
    state: CheckinState;
    opensAt: Date | null;
    /** True when starting now drops LOCKED teams that have not checked in. */
    required: boolean;
    /** LOCKED teams that checked in. */
    checkedIn: CheckinTeamView[];
    /** LOCKED teams that have not. */
    notCheckedIn: CheckinTeamView[];
    /**
     * The teams starting now would archive: DRAFT teams, plus (when `required`) the LOCKED teams
     * that have not checked in. The admin's start confirmation should list these.
     */
    willBeArchived: { id: number; name: string; status: string; reason: 'not_locked' | 'not_checked_in' }[];
}

@Injectable()
export class GetCheckinQuery {
    constructor(@InjectRepository(Tournament) private repo: Repository<Tournament>) {}

    async execute(id: number): Promise<CheckinView> {
        const tournament = await this.repo.findOne({ where: { id }, relations: ['teams'] });
        if (!tournament) throw new NotFoundException(`Tournament ${id} not found`);

        const teams = [...(tournament.teams ?? [])].sort((a, b) => a.id - b.id);
        const view = (t: (typeof teams)[number]): CheckinTeamView => ({
            id: t.id,
            name: t.name,
            checkedInAt: t.checked_in_at ?? null,
        });
        const locked = teams.filter((t) => t.status === TeamStatus.LOCKED);
        const startable = tournament.status === TournamentStatus.REGISTRATION_OPEN;
        const required = startable && checkinRequired(tournament);

        const notCheckedIn = locked.filter((t) => !t.checked_in_at);
        const willBeArchived: CheckinView['willBeArchived'] = [];
        if (startable) {
            for (const t of teams.filter((t) => t.status === TeamStatus.DRAFT)) {
                willBeArchived.push({ id: t.id, name: t.name, status: t.status, reason: 'not_locked' });
            }
            if (required) {
                for (const t of notCheckedIn) {
                    willBeArchived.push({ id: t.id, name: t.name, status: t.status, reason: 'not_checked_in' });
                }
            }
        }

        return {
            tournamentId: tournament.id,
            state: checkinState(tournament),
            opensAt: tournament.checkin_opens_at ?? null,
            required,
            checkedIn: locked.filter((t) => !!t.checked_in_at).map(view),
            notCheckedIn: notCheckedIn.map(view),
            willBeArchived,
        };
    }
}
