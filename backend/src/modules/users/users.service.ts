// src/modules/users/users.service.ts

import { Injectable } from '@nestjs/common';
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
        private readonly createUserCmd: CreateUserCommand,
        private readonly updateSettingsCmd: UpdateSettingsCommand,
        private readonly updateProfileCmd: UpdateProfileCommand,
        private readonly deleteUserCmd: DeleteUserCommand,
    ) {}

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