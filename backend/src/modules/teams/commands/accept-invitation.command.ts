import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Team } from '../entities/team.entity';
import { User } from '../../users/entities/user.entity';
import { TeamInvitation } from '../entities/team-invitation.entity';

@Injectable()
export class AcceptInvitationCommand {
    constructor(
        private dataSource: DataSource,
        @InjectRepository(TeamInvitation) private inviteRepo: Repository<TeamInvitation>,
    ) {}

    async execute(invitationId: number, userId: number) {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            const invite = await queryRunner.manager.findOne(TeamInvitation, {
                where: { id: invitationId, receiver_id: userId, status: 'PENDING' },
                relations: ['team', 'team.members']
            });

            if (!invite) throw new NotFoundException('Invitation not found or already processed');

            const team = invite.team;

            invite.status = 'ACCEPTED';
            await queryRunner.manager.save(invite);

            const user = await queryRunner.manager.findOneBy(User, { id: userId });
            if (!user) throw new NotFoundException('User not found');

            team.members.push(user);
            await queryRunner.manager.save(team);

            await queryRunner.commitTransaction();
            return { message: 'Joined team successfully', teamId: team.id };
            
        } catch (err) {
            await queryRunner.rollbackTransaction();
            throw err;
        } finally {
            await queryRunner.release();
        }
    }
}