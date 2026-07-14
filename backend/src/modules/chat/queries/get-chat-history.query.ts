// src/modules/chat/queries/get-chat-history.query.ts

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Message } from '../entities/message.entity';
import { ChatParticipant } from '../entities/chat-participant.entity';

@Injectable()
export class GetChatHistoryQuery {
    constructor(
        @InjectRepository(Message) 
        private readonly messageRepo: Repository<Message>,
        
        @InjectRepository(ChatParticipant) 
        private readonly partRepo: Repository<ChatParticipant>
    ) {}

    async execute(chatId: number, limit: number = 50, offset: number = 0) {
        const messages = await this.messageRepo.find({
            where: { 
                chatId: chatId, 
                deletedAt: IsNull()
            },
            order: { createdAt: 'DESC' },
            take: limit,
            skip: offset,
            relations: ['sender'],
        });

        if (messages.length === 0) return [];

        const participants = await this.partRepo.find({
            where: { chatId: chatId }
        });

        const messagesWithReadStatus = messages.map(msg => {
            const readByArray: number[] = [];

            participants.forEach(p => {
                if (p.lastReadAt && new Date(p.lastReadAt) >= new Date(msg.createdAt)) {
                    if (p.userId !== msg.senderId) {
                        readByArray.push(p.userId);
                    }
                }
            });
            return {
                ...msg,
                readBy: readByArray
            };
        });
        return messagesWithReadStatus;
    }
}