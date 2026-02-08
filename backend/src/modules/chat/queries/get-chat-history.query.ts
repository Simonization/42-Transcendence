import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Message } from '../entities/message.entity';

@Injectable()
export class GetChatHistoryQuery {
    constructor(@InjectRepository(Message) private readonly messageRepo: Repository<Message>) {}

    async execute(chatId: number, limit: number = 50, offset: number = 0) {
        return await this.messageRepo.find({
            where: { 
                chatId: chatId, 
                deletedAt: IsNull()
            },
            order: { createdAt: 'DESC' },
            take: limit,
            skip: offset,
            relations: ['sender'],
        });
    }
}