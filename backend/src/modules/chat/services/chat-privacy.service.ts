import { Injectable, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Friend } from '../../friends/entities/friend.entity';
import { Block } from '../../friends/entities/block.entity';
import { UserSettings } from '../../users/entities/user-settings.entity';
import { User } from '../../users/entities/user.entity';

@Injectable()
export class ChatPrivacyService {
    constructor(
        @InjectRepository(Friend) private readonly friendRepo: Repository<Friend>,
        @InjectRepository(Block) private readonly blockRepo: Repository<Block>,
        @InjectRepository(UserSettings) private readonly settingsRepo: Repository<UserSettings>,
        @InjectRepository(User) private readonly userRepo: Repository<User>,
    ) {}

    async validateAccess(senderId: number, receiverId: number): Promise<void> {
        const sid = Number(senderId);
        const rid = Number(receiverId);

        if (!sid || isNaN(sid)) {
            console.error('Error: ChatPrivacyService does not have senderId.');
            throw new ForbiddenException('Authentication error: Sender ID is missing or invalid.');
        }
        // A deleted account keeps its conversations (history) but takes no new messages.
        const receiver = await this.userRepo.findOne({ where: { id: rid }, select: ['id', 'deletedAt'] });
        if (!receiver || receiver.deletedAt) {
            throw new ForbiddenException('This account no longer exists.');
        }

        // A block must win outright. Blocking removes the friendship, so without this the
        // check falls through to the receiver's openMessage setting and a blocked sender can
        // still reach anyone who accepts messages from non-friends.
        const blocked = await this.blockRepo.findOne({
            where: [
                { blocker: { id: rid }, blocked: { id: sid } },
                { blocker: { id: sid }, blocked: { id: rid } },
            ],
        });
        if (blocked) {
            throw new ForbiddenException('Messaging is not available between these users.');
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