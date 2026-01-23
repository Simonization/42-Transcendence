import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Friend } from '../entities/friend.entity';

@Injectable()
export class GetFriendsQuery {
    constructor(
        @InjectRepository(Friend)
        private readonly friendRepo: Repository<Friend>,
    ) {}

    async execute(userId: number) {
        return await this.friendRepo.find({
            where: [
                { user: { id: userId } as any },
                { friend: { id: userId } as any }
            ],
            relations: ['user', 'user.profile', 'friend', 'friend.profile'],
        });
    }
}