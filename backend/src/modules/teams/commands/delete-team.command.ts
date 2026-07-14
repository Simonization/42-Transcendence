import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Team, TeamStatus } from '../entities/team.entity';
import { TeamInvitation } from '../entities/team-invitation.entity';

@Injectable()
export class DeleteTeamCommand {
    constructor(private dataSource: DataSource) {}

    async execute(teamId: number, userId: number) {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            const team = await queryRunner.manager.findOne(Team, {
                where: { id: teamId },
                relations: ['members'],
            });

            if (!team) throw new NotFoundException('Team not found');
            if (team.captain_id !== userId) throw new ForbiddenException('Only the captain can delete this team');
            if (team.status === TeamStatus.LOCKED) throw new ForbiddenException('Cannot delete a locked team');

            // Delete all invitations (FK constraint prevents team deletion if rows remain)
            await queryRunner.manager.delete(TeamInvitation, { team_id: teamId });

            // Clear members (removes rows from junction table)
            team.members = [];
            await queryRunner.manager.save(team);

            // Delete the team
            await queryRunner.manager.delete(Team, { id: teamId });

            await queryRunner.commitTransaction();
            return { message: 'Team deleted' };

        } catch (err) {
            await queryRunner.rollbackTransaction();
            throw err;
        } finally {
            await queryRunner.release();
        }
    }
}
