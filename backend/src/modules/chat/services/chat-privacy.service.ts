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
        const sid = Number(senderId);
        const rid = Number(receiverId);

        if (!sid || isNaN(sid)) {
            console.error('Error: ChatPrivacyService does not have senderId.');
            throw new ForbiddenException('Authentication error: Sender ID is missing or invalid.');
        }
        const [u1, u2] = [sid, rid].sort((a, b) => a - b);
        const friendship = await this.friendRepo.findOne({
            where: { user1: u1, user2: u2 }
        });

        if (friendship) {
            const s = String(friendship.status).toUpperCase();
            if (s === '1' || s === 'ACCEPTED' || s === 'FRIEND') {
                return;
            }
        }
        const settings = await this.settingsRepo.findOne({ where: { userId: rid } });
        if (settings?.openMessage) return;

        throw new ForbiddenException(`User ${rid} only accepts messages from friends.`);
    }
}