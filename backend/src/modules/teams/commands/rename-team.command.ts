import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Team } from '../entities/team.entity';
import { TournamentStatus } from '../../tournaments/entities/tournament.entity';
import { TeamPermissionsService } from '../services/team-permissions.service';
import { assertTeamNameFree, cleanTeamName, isTeamNameConflict, teamNameTaken } from '../utils/team-name';
import { RealtimeService } from '../../realtime/realtime.service';
import { RealtimeEvents } from '../../realtime/realtime.events';

@Injectable()
export class RenameTeamCommand {
    constructor(
        @InjectRepository(Team) private teamRepo: Repository<Team>,
        private readonly permissions: TeamPermissionsService,
        private readonly realtime: RealtimeService,
    ) {}

    async execute(teamId: number, name: string, actorId: number): Promise<Team> {
        const team = await this.teamRepo.findOne({
            where: { id: teamId },
            relations: ['tournament'],
        });
        if (!team) throw new NotFoundException('Team not found');
        await this.permissions.assertAdmin(teamId, team.captain_id, actorId);

        const tournamentStatus = team.tournament?.status;
        if (tournamentStatus === TournamentStatus.ONGOING || tournamentStatus === TournamentStatus.COMPLETED) {
            throw new BadRequestException('Cannot rename a team once the tournament has started');
        }

        // Unique per tournament (clear 409); a concurrent rename to the same name passes this
        // check too, and the unique index refuses whichever write comes second.
        const clean = cleanTeamName(name);
        if (team.tournament?.id != null) {
            await assertTeamNameFree(this.teamRepo.manager, team.tournament.id, clean, team.id);
        }

        team.name = clean;
        let saved: Team;
        try {
            saved = await this.teamRepo.save(team);
        } catch (err) {
            if (isTeamNameConflict(err)) throw teamNameTaken();
            throw err;
        }

        this.realtime.toTeam(teamId, RealtimeEvents.TEAM_UPDATED, { id: teamId, reason: 'team_renamed' });
        if (team.tournament?.id) {
            this.realtime.toTournament(team.tournament.id, RealtimeEvents.TOURNAMENT_UPDATED, { id: team.tournament.id, reason: 'team_renamed' });
        }
        return saved;
    }
}
