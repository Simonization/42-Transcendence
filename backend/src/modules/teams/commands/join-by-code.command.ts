import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Team, TeamStatus } from '../entities/team.entity';
import { User } from '../../users/entities/user.entity';
import { assertRegistrationOpen } from '../../tournaments/services/registration-window';
import { TeamMembershipService, DepartedTeam } from '../services/team-membership.service';
import { publishDepartures } from '../utils/publish-departures';
import { RealtimeService } from '../../realtime/realtime.service';
import { RealtimeEvents } from '../../realtime/realtime.events';

@Injectable()
export class JoinByCodeCommand {
    constructor(
        private dataSource: DataSource,
        private readonly membership: TeamMembershipService,
        private readonly realtime: RealtimeService,
    ) {}

    async execute(code: string, userId: number): Promise<{ message: string; teamId: number; tournamentId: number | null }> {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        let departed: DepartedTeam[] = [];

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
            assertRegistrationOpen(team.tournament);

            const phase1 = team.tournament?.phases?.find((p) => p.order === 1);
            const maxSize = phase1?.game?.teamSize ?? 1;
            if (team.members.length >= maxSize) {
                throw new BadRequestException(`That team is already full (${maxSize} players)`);
            }
            if (team.members.some((m) => m.id === userId)) {
                throw new BadRequestException('You are already a member of this team');
            }

            if (team.tournament?.id) {
                departed = await this.membership.assertCanJoin(queryRunner.manager, userId, team.tournament.id, team.id);
            }

            const user = await queryRunner.manager.findOneBy(User, { id: userId });
            if (!user) throw new NotFoundException('User not found');

            team.members.push(user);
            await queryRunner.manager.save(team);

            if (team.tournament?.id) {
                await this.membership.clearLookingForTeam(queryRunner.manager, userId, team.tournament.id);
            }

            await queryRunner.commitTransaction();

            publishDepartures(this.realtime, team.tournament?.id, userId, departed);
            this.realtime.toTeam(team.id, RealtimeEvents.TEAM_UPDATED, { id: team.id, reason: 'member_joined' });
            if (team.tournament?.id) {
                this.realtime.toTournament(team.tournament.id, RealtimeEvents.TOURNAMENT_UPDATED, { id: team.tournament.id, reason: 'looking_for_team_changed' });
            }
            return { message: 'Joined team successfully', teamId: team.id, tournamentId: team.tournament?.id ?? null };
        } catch (err) {
            await queryRunner.rollbackTransaction();
            throw err;
        } finally {
            await queryRunner.release();
        }
    }
}
