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
        const friendships = await this.friendRepo.find({
            where: [
                { user1: userId, status: 1 }, // Friends where I am user1
                { user2: userId, status: 1 }    // Friends where I am user2
            ],
            // We use the relation names defined in the Entity
            relations: ['user1Entity', 'user1Entity.profile', 'user2Entity', 'user2Entity.profile'],
        });

        // We map the results so the frontend doesn't have to guess who is who
        return friendships.map(f => {
            // If I am user1, the friend is user2. Otherwise, the friend is user1.
            const friendData = f.user1 === userId ? f.user2Entity : f.user1Entity;
            
            return {
                id: friendData.id,
                username: friendData.username,
                profile: friendData.profile,
                status: f.status,
                since: f.createdAt
            };
        });
    }
}