import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Team, TeamStatus } from '../entities/team.entity';
import { TeamAdmin } from '../entities/team-admin.entity';
import { TournamentStatus } from '../../tournaments/entities/tournament.entity';
import { RealtimeService } from '../../realtime/realtime.service';
import { RealtimeEvents } from '../../realtime/realtime.events';

@Injectable()
export class LeaveTeamCommand {
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
            if (team.captain_id === userId) {
                throw new ForbiddenException(
                    'The captain cannot leave — transfer captaincy or delete the team instead',
                );
            }

            const isMember = team.members.some((m) => m.id === userId);
            if (!isMember) throw new NotFoundException('You are not a member of this team');

            if (team.status === TeamStatus.LOCKED) {
                const tournamentStatus = team.tournament?.status;
                if (
                    tournamentStatus === TournamentStatus.ONGOING ||
                    tournamentStatus === TournamentStatus.COMPLETED
                ) {
                    throw new ForbiddenException(
                        'Cannot leave a locked team once the tournament has started',
                    );
                }
            }

            team.members = team.members.filter((m) => m.id !== userId);
            // Ex-members keep no rights over the team they left.
            await queryRunner.manager.delete(TeamAdmin, { teamId, userId });

            // Leaving a locked (registered) team un-registers it: the captain must re-lock
            // once the roster is fixed.
            const wasLocked = team.status === TeamStatus.LOCKED;
            if (wasLocked) {
                team.status = TeamStatus.DRAFT;
            }

            await queryRunner.manager.save(team);

            await queryRunner.commitTransaction();

            this.realtime.toTeam(teamId, RealtimeEvents.TEAM_UPDATED, { id: teamId, reason: 'member_left' });
            this.realtime.leaveTeamRoom(userId, teamId);
            if (wasLocked && team.tournament?.id) {
                this.realtime.toTournament(team.tournament.id, RealtimeEvents.TOURNAMENT_UPDATED, { id: team.tournament.id, reason: 'team_unlocked' });
            }
            return { message: 'Left team successfully' };

        } catch (err) {
            await queryRunner.rollbackTransaction();
            throw err;
        } finally {
            await queryRunner.release();
        }
    }
}
