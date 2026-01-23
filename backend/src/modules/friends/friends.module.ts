// src/modules/friends/friends.module.ts

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Entities
import { Friend } from './entities/friend.entity';
import { Block } from './entities/block.entity';
import { User } from '../users/entities/user.entity';

// Commands
import { AddFriendCommand } from './commands/add-friend.command';
import { RemoveFriendCommand } from './commands/remove-friend.command';
import { BlockUserCommand } from './commands/block-user.command';
import { UnblockUserCommand } from './commands/unblock-user.command';

// Query
import { GetFriendsQuery } from './queries/get-friends.query';
import { GetBlocksQuery } from './queries/get-blocks.query';

// Main Service & Controller
import { FriendsService } from './friends.service';
import { FriendsController } from './friends.controller';


@Module({
    imports: [
        TypeOrmModule.forFeature([
                Friend,
                Block,
                User])
        ],
        controllers: [FriendsController],
        providers: [
                FriendsService,
                AddFriendCommand,
                RemoveFriendCommand,
                BlockUserCommand,
                UnblockUserCommand,
                GetFriendsQuery,
                GetBlocksQuery,
    ],
})
export class FriendsModule {}