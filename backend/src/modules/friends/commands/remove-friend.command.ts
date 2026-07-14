import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Friend } from '../entities/friend.entity';
import { ActionFriendDto } from '../dto/action-friend.dto';
import { ChatGateway } from '../../chat/chat.gateway';

@Injectable()
export class RemoveFriendCommand {
    constructor(
        @InjectRepository(Friend) private readonly friendRepo: Repository<Friend>,
        private readonly chatGateway: ChatGateway 
    ) {}

    async execute(userId: number, dto: ActionFriendDto): Promise<void> {
        // Sort IDs to match our normalized database storage
        const [u1, u2] = [userId, dto.friendId].sort((a, b) => a - b);

        const friendship = await this.friendRepo.findOne({
            where: { user1: u1, user2: u2 }
        });

        if (!friendship) {
            throw new NotFoundException('Friendship not found');
        }

         this.chatGateway.broadcastToUsers([u1, u2], 'friendActivity', { user1: u1, user2: u2 });
        await this.friendRepo.remove(friendship);
    }
}