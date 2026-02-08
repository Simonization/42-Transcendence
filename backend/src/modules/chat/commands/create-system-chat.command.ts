import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Chat } from '../entities/chat.entity';
import { ChatParticipant } from '../entities/chat-participant.entity';

@Injectable()
export class CreateSystemChatCommand {
    constructor(
        @InjectRepository(Chat) private readonly chatRepo: Repository<Chat>,
        @InjectRepository(ChatParticipant) private readonly partRepo: Repository<ChatParticipant>,
    ) {}

    async execute(targetUserIds: number[], title?: string) {
        const isPrivate = targetUserIds.length === 1;
        
        const chat = await this.chatRepo.save(
            this.chatRepo.create({
                type: 2, 
                title: isPrivate ? `System Alert` : (title || 'System Group')
            })
        );

        const participants = targetUserIds.map(id => 
            this.partRepo.create({ chatId: chat.id, userId: id })
        );

        await this.partRepo.save(participants);
        return chat;
    }
}