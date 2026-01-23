// src/modules/users/users.module.ts

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Entities
import { User } from './entities/user.entity';
import { UserProfile } from './entities/user-profile.entity';
import { UserSettings } from './entities/user-settings.entity';
import { UserGameAccount } from './entities/user-game-account.entity';

// Commands
import { CreateUserCommand } from './commands/create-user.command';
import { UpdateSettingsCommand } from './commands/update-settings.command';
import { UpdateProfileCommand } from './commands/update-profile.command';
import { DeleteUserCommand } from './commands/delete-user.command';

// Main Service & Controller
import { UsersService } from './users.service';
import { UsersController } from './users.controller';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            User, 
            UserProfile, 
            UserSettings, 
            UserGameAccount
        ]),
    ],
    providers: [
        UsersService,
        CreateUserCommand,
        UpdateSettingsCommand,
        UpdateProfileCommand,
        DeleteUserCommand,
    ],
    controllers: [UsersController],
    exports: [UsersService],
})
export class UsersModule {}