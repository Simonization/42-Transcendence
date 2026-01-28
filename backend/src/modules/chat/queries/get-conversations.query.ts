import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Chat } from '../entities/chat.entity';

@Injectable()
export class GetConversationsQuery {
    constructor(
        @InjectRepository(Chat) private readonly chatRepo: Repository<Chat>,
    ) {}

    async execute(userId: number, limit: number | undefined) {
        const chats = await this.chatRepo.createQueryBuilder('chat')
            // Only get chats where the user is a participant
            .innerJoin('chat.participants', 'me', 'me.userId = :userId', { userId })
            // Get other participants for DM names/avatars
            .leftJoinAndSelect('chat.participants', 'all_parts')
            .leftJoinAndSelect('all_parts.user', 'user')
            // Get the single latest message for the preview
            .leftJoinAndMapOne(
                'chat.lastMessage',
                'messages',
                'lastMessage',
                'lastMessage.chatId = chat.id AND lastMessage.deletedAt IS NULL'
            )
            .orderBy('lastMessage.createdAt', 'DESC')
            .getMany();

        return chats.map(chat => {
            const myParticipantData = chat.participants.find(p => p.userId === userId);
            const lastMessageDate = chat['lastMessage']?.createdAt;

            return {
                id: chat.id,
                type: chat.type,
                title: chat.title,
                participants: chat.participants.map(p => ({
                    id: p.user.id,
                    username: p.user.username,
                })),
                lastMessage: chat['lastMessage'],
                // Logic for the frontend to "Bold" the chat
                isUnread: lastMessageDate > (myParticipantData?.lastReadAt || 0),
            };
        });
    }
}