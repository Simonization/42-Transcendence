// src/modules/users/users.service.ts

import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { User } from './entities/user.entity';
import { UserProfile } from './entities/user-profile.entity';
import { CreateUserCommand } from './commands/create-user.command';
import { UpdateSettingsCommand } from './commands/update-settings.command';
import { UpdateProfileCommand } from './commands/update-profile.command';
import { DeleteUserCommand } from './commands/delete-user.command';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateAdminUserDto } from './dto/update-admin-user.dto';
import { ChatGateway } from '../chat/chat.gateway';
import { RealtimeService } from '../realtime/realtime.service';
import { RealtimeEvents } from '../realtime/realtime.events';

@Injectable()
export class UsersService {
    constructor(
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
        @InjectRepository(UserProfile)
        private readonly userProfileRepository: Repository<UserProfile>,
        private readonly createUserCmd: CreateUserCommand,
        private readonly updateSettingsCmd: UpdateSettingsCommand,
        private readonly updateProfileCmd: UpdateProfileCommand,
        private readonly deleteUserCmd: DeleteUserCommand,
        private readonly chatGateway: ChatGateway,
        private readonly realtime: RealtimeService,
    ) {}

    async search(q: string, limit: number) {
        const qb = this.userRepository.createQueryBuilder('user')
            .leftJoinAndSelect('user.profile', 'profile')
            .select(['user.id', 'user.username', 'user.avatarUrl', 'user.status', 'user.role', 'profile']);

        // Deleted accounts are tombstones: never found, invited or befriended.
        qb.where('user.deletedAt IS NULL');
        if (q) {
            qb.andWhere('LOWER(user.username) LIKE :q', { q: `%${q.toLowerCase()}%` });
        }

        qb.orderBy('user.username', 'ASC').take(Math.min(limit, 100));

        return qb.getMany();
    }

    async findOne(id: number) {
        const user = await this.userRepository.findOne({
            where: { id },
            relations: ['profile', 'settings']
        });
        if (!user) {
            throw new BadRequestException('User not found');
        }
        return {
            id: user.id,
            username: user.username,
            mail: user.mail,
            role: user.role,
            status: user.status,
            twoFactorEnabled: user.twoFactorEnabled,
            avatarUrl: user.avatarUrl,
            profile: user.profile,
            settings: user.settings
        };
    }

    async create(dto: CreateUserDto) {
        return await this.createUserCmd.execute(dto);
    }

    async updateSettings(userId: number, dto: UpdateSettingsDto) {
        return await this.updateSettingsCmd.execute(userId, dto);
    }

    async updateProfile(userId: number, dto: UpdateProfileDto) {
        return await this.updateProfileCmd.execute(userId, dto);
    }

    /** Anonymises the account (see DeleteUserCommand), then signs it out everywhere. */
    async remove(userId: number) {
        const result = await this.deleteUserCmd.execute(userId);

        // Open sockets go now; the JWT strategy and the refresh endpoint refuse the rest.
        await this.chatGateway.disconnectUser(userId, 'account_deleted');
        for (const teamId of [...result.updatedTeamIds, ...result.deletedTeamIds]) {
            const reason = result.deletedTeamIds.includes(teamId) ? 'team_deleted' : 'member_deleted';
            this.realtime.toTeam(teamId, RealtimeEvents.TEAM_UPDATED, { id: teamId, reason });
        }
        for (const tournamentId of result.tournamentIds) {
            this.realtime.toTournament(tournamentId, RealtimeEvents.TOURNAMENT_UPDATED, { id: tournamentId, reason: 'member_deleted' });
        }
        return { message: 'Account deleted' };
    }

    /**
     * Get all users with pagination and optional search filter
     */
    async getAllUsers(page: number = 1, limit: number = 20, search?: string) {
        const query = this.userRepository.createQueryBuilder('user');

        if (search) {
            query.where('user.username ILIKE :q OR user.mail ILIKE :q', { 
                q: `%${search}%` 
            });
        }

        const [users, total] = await query
            .leftJoinAndSelect('user.profile', 'profile')
            .take(limit)
            .skip((page - 1) * limit)
            .addOrderBy('user.createdAt', 'DESC')
            .getManyAndCount();

        return {
            users: users.map(user => ({
                id: user.id,
                isDeleted: !!user.deletedAt,
                username: user.username,
                mail: user.mail,
                role: user.role,
                status: user.status,
                banUntil: user.banUntil,
                twoFactorEnabled: user.twoFactorEnabled,
                avatarUrl: user.avatarUrl,
                createdAt: user.createdAt,
                profile: user.profile,
            })),
            total,
        };
    }

    /**
     * Admin endpoint: Update user (username, status, avatarUrl)
     */
    async adminUpdateUser(userId: number, dto: UpdateAdminUserDto) {
        const user = await this.userRepository.findOne({
            where: { id: userId },
            relations: ['profile'],
        });

        if (!user) {
            throw new BadRequestException('User not found');
        }

        if (dto.username) {
            user.username = dto.username;
        }

        if (dto.displayName !== undefined) {
            if (!user.profile) {
                await this.userProfileRepository.upsert({
                    userId: user.id,
                    displayName: dto.displayName,
                    avatarUrl: undefined,
                    bio: undefined,
                }, ['userId']);
                user.profile = await this.userProfileRepository.findOne({ where: { userId: user.id } }) as UserProfile;
            } else {
                user.profile.displayName = dto.displayName;
            }
        }

        if (dto.status !== undefined) {
            user.status = dto.status;
            if (dto.status === 1) {
                if (dto.banUnit === 'permanent') {
                    user.banUntil = null;
                } else if (dto.banUnit === 'hours' || dto.banUnit === 'days') {
                    const now = Date.now();
                    const multiplier = dto.banUnit === 'hours' ? 3600000 : 86400000;
                    const value = dto.banValue ?? 1;
                    user.banUntil = new Date(now + value * multiplier);
                } else {
                    user.banUntil = null;
                }
            } else {
                user.banUntil = null;
            }
        }

        if (dto.avatarUrl !== undefined) {
            user.avatarUrl = dto.avatarUrl;
        }

        await this.userRepository.save(user);

        if (dto.status === 1) {
            this.chatGateway.disconnectUser(user.id);
        }

        return {
            id: user.id,
            username: user.username,
            mail: user.mail,
            role: user.role,
            status: user.status,
            banUntil: user.banUntil,
            twoFactorEnabled: user.twoFactorEnabled,
            avatarUrl: user.avatarUrl,
            profile: user.profile,
        };
    }
}