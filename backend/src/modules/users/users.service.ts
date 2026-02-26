// src/modules/users/users.service.ts

import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserCommand } from './commands/create-user.command';
import { UpdateSettingsCommand } from './commands/update-settings.command';
import { UpdateProfileCommand } from './commands/update-profile.command';
import { DeleteUserCommand } from './commands/delete-user.command';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateAdminUserDto } from './dto/update-admin-user.dto';

@Injectable()
export class UsersService {
    constructor(
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
        private readonly createUserCmd: CreateUserCommand,
        private readonly updateSettingsCmd: UpdateSettingsCommand,
        private readonly updateProfileCmd: UpdateProfileCommand,
        private readonly deleteUserCmd: DeleteUserCommand,
    ) {}

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

    async remove(userId: number) {
        return await this.deleteUserCmd.execute(userId);
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
            .take(limit)
            .skip((page - 1) * limit)
            .addOrderBy('user.createdAt', 'DESC')
            .getManyAndCount();

        return {
            users: users.map(user => ({
                id: user.id,
                username: user.username,
                mail: user.mail,
                role: user.role,
                status: user.status,
                twoFactorEnabled: user.twoFactorEnabled,
                avatarUrl: user.avatarUrl,
                createdAt: user.createdAt,
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
        });

        if (!user) {
            throw new BadRequestException('User not found');
        }

        if (dto.username) {
            user.username = dto.username;
        }

        if (dto.status !== undefined) {
            user.status = dto.status;
        }

        if (dto.avatarUrl !== undefined) {
            user.avatarUrl = dto.avatarUrl;
        }

        await this.userRepository.save(user);

        return {
            id: user.id,
            username: user.username,
            mail: user.mail,
            role: user.role,
            status: user.status,
            twoFactorEnabled: user.twoFactorEnabled,
            avatarUrl: user.avatarUrl,
        };
    }
}