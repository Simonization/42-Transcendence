// src/modules/users/users.service.ts

import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserCommand } from './commands/create-user.command';
import { UpdateSettingsCommand } from './commands/update-settings.command';
import { UpdateProfileCommand } from './commands/update-profile.command';
import { DeleteUserCommand } from './commands/delete-user.command';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

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
            twoFactorEnabled: user.twoFactorEnabled,
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
}