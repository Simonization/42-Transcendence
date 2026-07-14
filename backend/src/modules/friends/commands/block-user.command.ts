import { Injectable, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Block } from '../entities/block.entity';
import { Friend } from '../entities/friend.entity';
import { BlockUserDto } from '../dto/block-user.dto';
import { ChatGateway } from '../../chat/chat.gateway';

@Injectable()
export class BlockUserCommand {
    constructor(
        @InjectRepository(Block) private readonly blockRepo: Repository<Block>,
        @InjectRepository(Friend) private readonly friendRepo: Repository<Friend>,
        private readonly chatGateway: ChatGateway
    ) {}

    async execute(userId: number, dto: BlockUserDto) {
        if (userId === dto.targetId) {
            throw new BadRequestException("You cannot block yourself");
        }

        const existingBlock = await this.blockRepo.findOne({
            where: { blocker: { id: userId }, blocked: { id: dto.targetId } }
        });

        if (existingBlock) {
            throw new ConflictException("User is already blocked");
        }

        const block = this.blockRepo.create({
            blocker: { id: userId },
            blocked: { id: dto.targetId },
            reason: dto.reason
        });
        const savedBlock = await this.blockRepo.save(block);

        const [u1, u2] = [userId, dto.targetId].sort((a, b) => a - b);
        const existingFriendship = await this.friendRepo.findOne({
            where: { user1: u1, user2: u2 }
        });

        if (existingFriendship) {
            await this.friendRepo.remove(existingFriendship);
            
            this.chatGateway.broadcastToUsers([userId, dto.targetId], 'friendActivity', { user1: u1, user2: u2 });
        }

        return savedBlock;
    }
}