import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Team, TeamStatus } from '../entities/team.entity';
import { TeamInvitation } from '../entities/team-invitation.entity';
import { Match } from '../../matches/entities/match.entity';
import { TournamentStatus } from '../../tournaments/entities/tournament.entity';
import { RealtimeService } from '../../realtime/realtime.service';
import { RealtimeEvents } from '../../realtime/realtime.events';

@Injectable()
export class DeleteTeamCommand {
    constructor(
        private dataSource: DataSource,
        private readonly realtime: RealtimeService,
    ) {}

    async execute(teamId: number, userId: number) {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            const team = await queryRunner.manager.findOne(Team, {
                where: { id: teamId },
                relations: ['members', 'tournament'],
            });

            if (!team) throw new NotFoundException('Team not found');
            if (team.captain_id !== userId) throw new ForbiddenException('Only the captain can delete this team');
            if (team.status === TeamStatus.LOCKED) throw new ForbiddenException('Cannot delete a locked team');
            // Once its tournament has left registration (or the team ever played), the team is
            // part of the bracket's history: deleting it would blank its match slots (the FK is
            // ON DELETE SET NULL) and drop it from standings and podiums.
            if (team.tournament && team.tournament.status !== TournamentStatus.REGISTRATION_OPEN) {
                throw new ForbiddenException('Teams cannot be deleted once their tournament has started');
            }
            const played = await queryRunner.manager.count(Match, {
                where: [{ team1_id: teamId }, { team2_id: teamId }],
            });
            if (played > 0) throw new ForbiddenException('Cannot delete a team that has matches');

            // Delete all invitations (FK constraint prevents team deletion if rows remain)
            await queryRunner.manager.delete(TeamInvitation, { team_id: teamId });

            // Clear members (removes rows from junction table)
            team.members = [];
            await queryRunner.manager.save(team);

            // Delete the team
            await queryRunner.manager.delete(Team, { id: teamId });

            await queryRunner.commitTransaction();

            this.realtime.toTeam(teamId, RealtimeEvents.TEAM_UPDATED, { id: teamId, reason: 'team_deleted' });
            if (team.tournament?.id) {
                this.realtime.toTournament(team.tournament.id, RealtimeEvents.TOURNAMENT_UPDATED, { id: team.tournament.id, reason: 'team_deleted' });
            }
            return { message: 'Team deleted' };

        } catch (err) {
            await queryRunner.rollbackTransaction();
            throw err;
        } finally {
            await queryRunner.release();
        }
    }
}
