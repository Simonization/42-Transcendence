import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Friend } from '../entities/friend.entity';
import { ActionFriendDto } from '../dto/action-friend.dto';

@Injectable()
export class RemoveFriendCommand {
    constructor(@InjectRepository(Friend) private readonly friendRepo: Repository<Friend>) {}

    async execute(userId: number, dto: ActionFriendDto): Promise<void> {
    const friendship = await this.friendRepo.findOne({
        where: {
            user: { id: userId } as any,
            friend: { id: dto.friendId } as any
        }
    });

    if (!friendship) {
        throw new NotFoundException('Friendship not found');
    }

    await this.friendRepo.remove(friendship);
    }
}