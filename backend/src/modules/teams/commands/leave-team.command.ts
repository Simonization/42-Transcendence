import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Team, TeamStatus } from '../entities/team.entity';

@Injectable()
export class LeaveTeamCommand {
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
            if (team.captain_id === userId) throw new ForbiddenException('Captain cannot leave — use delete instead');
            if (team.status === TeamStatus.LOCKED) throw new ForbiddenException('Cannot leave a locked team');

            const isMember = team.members.some(m => m.id === userId);
            if (!isMember) throw new NotFoundException('You are not a member of this team');

            team.members = team.members.filter(m => m.id !== userId);
            await queryRunner.manager.save(team);

            await queryRunner.commitTransaction();
            return { message: 'Left team successfully' };

        } catch (err) {
            await queryRunner.rollbackTransaction();
            throw err;
        } finally {
            await queryRunner.release();
        }
    }
}
