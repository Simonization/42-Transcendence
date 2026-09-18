import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TeamAdmin } from '../entities/team-admin.entity';

@Injectable()
export class TeamPermissionsService {
    constructor(
        @InjectRepository(TeamAdmin) private readonly adminRepo: Repository<TeamAdmin>,
    ) {}

    async isAdmin(teamId: number, captainId: number, userId: number): Promise<boolean> {
        if (captainId === userId) return true;
        return await this.adminRepo.existsBy({ teamId, userId });
    }

    async assertAdmin(teamId: number, captainId: number, userId: number): Promise<void> {
        if (!(await this.isAdmin(teamId, captainId, userId))) {
            throw new ForbiddenException('Only the captain or a team admin can do this');
        }
    }

    async listAdminIds(teamId: number): Promise<number[]> {
        const rows = await this.adminRepo.findBy({ teamId });
        return rows.map((r) => r.userId);
    }
}
