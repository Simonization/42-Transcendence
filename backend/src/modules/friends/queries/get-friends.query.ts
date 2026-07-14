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

    async execute(userId: any) {
        const uid = Number(userId);

        if (!uid || isNaN(uid)) {
            console.error('Error. GetFriendsQuery returns undefined value.', userId);
            return [];
        }

        const friendships = await this.friendRepo.find({
            where: [
                { user1: uid }, 
                { user2: uid }  
            ],
            relations: ['user1Entity', 'user1Entity.profile', 'user2Entity', 'user2Entity.profile'],
        });

        const validFriendships = friendships.filter(f => {
            const safeStatus = String(f.status).toUpperCase();
            const isAccepted = safeStatus === '1' || safeStatus === 'ACCEPTED';
            const isPending = safeStatus === '0' || safeStatus === 'PENDING';
            
            const isSender = Number(f.actionUserId) === uid;

            if (isAccepted) return true;
            if (isPending && !isSender) return true; 

            return false;
        });

        return validFriendships.map(f => {
            const friendData = Number(f.user1) === uid ? f.user2Entity : f.user1Entity;
            
            const safeProfile = friendData?.profile || { displayName: friendData?.username || 'Unknown User' };
            const safeStatus = String(f.status).toUpperCase();
            const numericStatus = (safeStatus === '1' || safeStatus === 'ACCEPTED') ? 1 : 0;

            return {
                id: friendData?.id,
                username: friendData?.username,
                profile: safeProfile,
                status: numericStatus,
                since: f.createdAt,
                isSender: Number(f.actionUserId) === uid
            };
        });
    }
}