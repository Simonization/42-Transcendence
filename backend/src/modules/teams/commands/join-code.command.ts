import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Team } from '../entities/team.entity';
import { TeamPermissionsService } from '../services/team-permissions.service';
import { generateJoinCode } from '../utils/join-code';

@Injectable()
export class JoinCodeCommand {
    constructor(
        @InjectRepository(Team) private teamRepo: Repository<Team>,
        private readonly permissions: TeamPermissionsService,
    ) {}

    /** Members only — the code is a bypass for the invite flow, not public data. */
    async get(teamId: number, requesterId: number): Promise<{ joinCode: string }> {
        const team = await this.loadWithCode(teamId);
        const isMember = team.members?.some((m) => m.id === requesterId);
        if (!isMember) {
            throw new ForbiddenException('Only team members can view the join code');
        }
        return { joinCode: team.join_code };
    }

    async regenerate(teamId: number, actorId: number): Promise<{ joinCode: string }> {
        const team = await this.loadWithCode(teamId);
        await this.permissions.assertAdmin(teamId, team.captain_id, actorId);

        for (let attempt = 0; attempt < 5; attempt++) {
            const code = generateJoinCode();
            const exists = await this.teamRepo
                .createQueryBuilder('team')
                .addSelect('team.join_code')
                .where('team.join_code = :code', { code })
                .getExists();
            if (!exists) {
                await this.teamRepo.update(teamId, { join_code: code });
                return { joinCode: code };
            }
        }
        throw new Error('Could not generate a unique join code');
    }

    private async loadWithCode(teamId: number): Promise<Team> {
        const team = await this.teamRepo
            .createQueryBuilder('team')
            .addSelect('team.join_code')
            .leftJoinAndSelect('team.members', 'members')
            .where('team.id = :teamId', { teamId })
            .getOne();
        if (!team) throw new NotFoundException('Team not found');
        return team;
    }
}
