import { BadRequestException, Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Friend } from '../entities/friend.entity';
import { ActionFriendDto } from '../dto/action-friend.dto';
import { User } from '../../users/entities/user.entity';
import { ChatGateway } from '../../chat/chat.gateway';
import { NotificationsService } from '../../notifications/notifications.service';
import { NotificationDestination } from '../../notifications/entities/notification.entity';

@Injectable()
export class AddFriendCommand {
    constructor(
        @InjectRepository(Friend) private readonly friendRepo: Repository<Friend>,
        @InjectRepository(User) private readonly userRepo: Repository<User>,
        private readonly chatGateway: ChatGateway,
        private readonly notificationsService: NotificationsService,
    ) {}

    async execute(userId: number, dto: ActionFriendDto) {
        if (userId === dto.friendId) {
            throw new BadRequestException("Self-friending is not allowed");
        }

        const targetUser = await this.userRepo.findOne({ where: { id: dto.friendId } });
        if (!targetUser) {
            throw new NotFoundException("No User found"); 
        }
        
        const currentUser = await this.userRepo.findOne({ where: { id: userId } });
        if (!currentUser) {
            throw new NotFoundException("Current user not found");
        }

        const [u1, u2] = [userId, dto.friendId].sort((a, b) => a - b);
        const existing = await this.friendRepo.findOne({ where: { user1: u1, user2: u2 } });
        
        if (existing) {
            if (existing.status === 1) {
                throw new ConflictException("You are already friends");
            } 
            else if (existing.status === 0) {
                if (existing.actionUserId === userId) {
                    throw new ConflictException("Friend request already sent");
                } 
                else {
                    existing.status = 1;
                    const result = await this.friendRepo.save(existing);
                    
                    this.chatGateway.broadcastToUsers([u1, u2], 'friendActivity', { user1: u1, user2: u2 });
                    
                    // Notify the user who sent the initial request that it was accepted
                    const originalRequester = existing.actionUserId;
                    if (originalRequester) {
                        try {
                            await this.notificationsService.sendNotification(
                                originalRequester,
                                'friend_request_accepted',
                                `${currentUser.username} accepted your friend request`,
                                undefined,
                                {
                                    friendId: userId,
                                    username: currentUser.username,
                                },
                                NotificationDestination.BELL
                            );
                        } catch (notifError) {
                            console.error('Failed to send friend request accepted notification:', notifError);
                        }
                    }
                    
                    return result;
                }
            } 
            else {
                throw new ConflictException("This action cannot be performed");
            }
        }

        const friendship = this.friendRepo.create({
            user1: u1,
            user2: u2,
            status: 0,
            actionUserId: userId,
        });

        const result = await this.friendRepo.save(friendship);
        this.chatGateway.broadcastToUsers([u1, u2], 'friendActivity', { user1: u1, user2: u2 });
        
        // Notify the target user of the friend request
        try {
            await this.notificationsService.sendNotification(
                dto.friendId,
                'friend_request',
                `${currentUser.username} sent you a friend request`,
                undefined,
                {
                    requesterId: userId,
                    username: currentUser.username,
                },
                NotificationDestination.BELL
            );
        } catch (notifError) {
            console.error('Failed to send friend request notification:', notifError);
        }
        
        return result;
    }
}