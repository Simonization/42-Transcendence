import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Team, TeamStatus } from '../entities/team.entity';
import { User } from '../../users/entities/user.entity';
import { TournamentStatus } from '../../tournaments/entities/tournament.entity';
import { TeamMembershipService } from '../services/team-membership.service';

@Injectable()
export class JoinByCodeCommand {
    constructor(
        private dataSource: DataSource,
        private readonly membership: TeamMembershipService,
    ) {}

    async execute(code: string, userId: number): Promise<{ message: string; teamId: number; tournamentId: number | null }> {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            const team = await queryRunner.manager
                .createQueryBuilder(Team, 'team')
                .addSelect('team.join_code')
                .leftJoinAndSelect('team.members', 'members')
                .leftJoinAndSelect('team.tournament', 'tournament')
                .leftJoinAndSelect('tournament.phases', 'phases')
                .leftJoinAndSelect('phases.game', 'game')
                .where('team.join_code = :code', { code })
                .getOne();

            if (!team) throw new NotFoundException('Invalid join code');

            if (team.status !== TeamStatus.DRAFT) {
                throw new BadRequestException('This team is not open to new members');
            }
            if (team.tournament?.status !== TournamentStatus.REGISTRATION_OPEN) {
                throw new BadRequestException('Tournament is not open for registration');
            }

            const phase1 = team.tournament?.phases?.find((p) => p.order === 1);
            const maxSize = phase1?.game?.teamSize ?? 1;
            if (team.members.length >= maxSize) {
                throw new BadRequestException(`That team is already full (${maxSize} players)`);
            }
            if (team.members.some((m) => m.id === userId)) {
                throw new BadRequestException('You are already a member of this team');
            }

            if (team.tournament?.id) {
                await this.membership.assertCanJoin(queryRunner.manager, userId, team.tournament.id, team.id);
            }

            const user = await queryRunner.manager.findOneBy(User, { id: userId });
            if (!user) throw new NotFoundException('User not found');

            team.members.push(user);
            await queryRunner.manager.save(team);

            if (team.tournament?.id) {
                await this.membership.clearLookingForTeam(queryRunner.manager, userId, team.tournament.id);
            }

            await queryRunner.commitTransaction();
            return { message: 'Joined team successfully', teamId: team.id, tournamentId: team.tournament?.id ?? null };
        } catch (err) {
            await queryRunner.rollbackTransaction();
            throw err;
        } finally {
            await queryRunner.release();
        }
    }
}
