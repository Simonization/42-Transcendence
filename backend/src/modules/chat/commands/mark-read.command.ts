// src/modules/chat/commands/mark-read.command.ts

import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatParticipant } from '../entities/chat-participant.entity';
import { ChatGateway } from '../chat.gateway';

@Injectable()
export class MarkReadCommand {
    constructor(
        @InjectRepository(ChatParticipant) 
        private readonly partRepo: Repository<ChatParticipant>,
        
        @Inject(forwardRef(() => ChatGateway))
        private readonly chatGateway: ChatGateway 
    ) {}

    async execute(userId: number, chatId: number): Promise<void> {
        const participant = await this.partRepo.findOne({ 
            where: { chatId, userId } 
        });

        if (!participant) return; 

        participant.lastReadAt = new Date();
        await this.partRepo.save(participant);

        this.chatGateway.server.to(`room_${chatId}`).emit('messagesRead', {
            roomId: chatId,
            userId: userId
        });
    }
}