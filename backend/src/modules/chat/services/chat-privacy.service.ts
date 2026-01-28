import { Injectable, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Friend } from '../../friends/entities/friend.entity';
import { UserSettings } from '../../users/entities/user-settings.entity';

@Injectable()
export class ChatPrivacyService {
    constructor(
        @InjectRepository(Friend) private readonly friendRepo: Repository<Friend>,
        @InjectRepository(UserSettings) private readonly settingsRepo: Repository<UserSettings>,
    ) {}

    async validateAccess(senderId: number, receiverId: number): Promise<void> {
        // 1. Check friendship (status 1 = accepted)
        const friendship = await this.friendRepo.findOne({
            where: [
                { user1: senderId, user2: receiverId, status: 1 },
                { user1: receiverId, user2: senderId, status: 1 }
            ]
        });
        if (friendship) return;

        // 2. Check "open_message" setting
        const settings = await this.settingsRepo.findOne({ where: { userId: receiverId } });
        if (settings?.openMessage) return;

        // 3. If neither, block the action
        throw new ForbiddenException(`User ${receiverId} only accepts messages from friends.`);
    }
}