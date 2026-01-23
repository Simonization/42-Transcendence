import { BadRequestException, Injectable } from '@nestjs/common';
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
        if (userId === dto.friendId) throw new BadRequestException("Self-friending is not allowed");

        const friendship = this.friendRepo.create({
            user: { id: userId },
            friend: { id: dto.friendId },
        });
        return await this.friendRepo.save(friendship);
    }
}