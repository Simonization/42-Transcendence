import { BadRequestException, Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Friend } from '../entities/friend.entity';
import { ActionFriendDto } from '../dto/action-friend.dto';

@Injectable()
export class AddFriendCommand {
    constructor(
        @InjectRepository(Friend) private readonly friendRepo: Repository<Friend>
    ) {}

    async execute(userId: number, dto: ActionFriendDto) {
        if (userId === dto.friendId) {
            throw new BadRequestException("Self-friending is not allowed");
        }

        const [u1, u2] = [userId, dto.friendId].sort((a, b) => a - b);

        const existing = await this.friendRepo.findOne({ where: { user1: u1, user2: u2 } });
        if (existing) {
            throw new ConflictException("Friendship or request already exists");
        }

        const friendship = this.friendRepo.create({
            user1: u1,
            user2: u2,
            status: 0,
        });

        return await this.friendRepo.save(friendship);
    }
}