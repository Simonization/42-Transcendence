// src/modules/friends/friends.service.ts

import { Injectable } from '@nestjs/common';
import { AddFriendCommand } from './commands/add-friend.command';
import { RemoveFriendCommand } from './commands/remove-friend.command';
import { BlockUserCommand } from './commands/block-user.command';
import { ActionFriendDto } from './dto/action-friend.dto';
import { BlockUserDto } from './dto/block-user.dto';
import { UnblockUserDto } from './dto/unblock-user.dto';
import { UnblockUserCommand } from './commands/unblock-user.command';
import { GetFriendsQuery } from './queries/get-friends.query';
import { GetBlocksQuery } from './queries/get-blocks.query';

@Injectable()
export class FriendsService {
    constructor(
        private readonly addFriendCmd: AddFriendCommand,
        private readonly removeFriendCmd: RemoveFriendCommand,
        private readonly blockUserCmd: BlockUserCommand,
        private readonly unblockUserCmd: UnblockUserCommand,
        private readonly getFriendsQuery: GetFriendsQuery,
        private readonly getBlocksQuery: GetBlocksQuery,
    ) {}
    
    async addFriend(userId: number, dto: ActionFriendDto) {
        return this.addFriendCmd.execute(userId, dto);
    }

    async removeFriend(userId: number, dto: ActionFriendDto) {
        return this.removeFriendCmd.execute(userId, dto);
    }

    async blockUser(userId: number, dto: BlockUserDto) {
        return this.blockUserCmd.execute(userId, dto);
    }

    async unblockUser(userId: number, dto: UnblockUserDto) {
        return this.unblockUserCmd.execute(userId, dto);
    }

    async getFriends(userId: number) {
        return this.getFriendsQuery.execute(userId);
    }

    async getBlocks(userId: number) {
        return this.getBlocksQuery.execute(userId);
    }
}