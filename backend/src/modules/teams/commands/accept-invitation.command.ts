import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Team, TeamStatus } from '../entities/team.entity';
import { User } from '../../users/entities/user.entity';
import { InvitationStatus, TeamInvitation } from '../entities/team-invitation.entity';

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
                where: { id: invitationId, receiver_id: userId, status: InvitationStatus.PENDING },
                relations: ['team', 'team.members', 'team.tournament']
            });

            if (!invite) throw new NotFoundException('Invitation not found or already processed');

            const team = invite.team;

            invite.status = InvitationStatus.ACCEPTED;
            await queryRunner.manager.save(invite);

            const user = await queryRunner.manager.findOneBy(User, { id: userId });
            if (!user) throw new NotFoundException('User not found');

            team.members.push(user);
            await queryRunner.manager.save(team);

            // Remove user from any other teams they belong to in the same tournament
            if (team.tournament?.id) {
                const otherTeams = await queryRunner.manager
                    .createQueryBuilder(Team, 'team')
                    .innerJoin('team.members', 'member', 'member.id = :userId', { userId })
                    .innerJoin('team.tournament', 'tournament', 'tournament.id = :tournamentId', { tournamentId: team.tournament.id })
                    .leftJoinAndSelect('team.members', 'allMembers')
                    .where('team.id != :newTeamId', { newTeamId: team.id })
                    .getMany();

                for (const otherTeam of otherTeams) {
                    const others = otherTeam.members.filter(m => m.id !== userId);
                    if (otherTeam.captain_id === userId) {
                        if (others.length > 0) {
                            // Transfer captaincy
                            otherTeam.captain_id = others[0].id;
                            otherTeam.members = others;
                            await queryRunner.manager.save(otherTeam);
                        } else {
                            // Solo captain — delete the team (remove invitations first to satisfy FK)
                            await queryRunner.manager.delete(TeamInvitation, { team_id: otherTeam.id });
                            otherTeam.members = [];
                            await queryRunner.manager.save(otherTeam);
                            await queryRunner.manager.delete(Team, { id: otherTeam.id });
                        }
                    } else {
                        // Regular member — just remove
                        otherTeam.members = others;
                        await queryRunner.manager.save(otherTeam);
                    }
                }
            }

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
