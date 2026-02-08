import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatParticipant } from '../entities/chat-participant.entity';

@Injectable()
export class MarkReadCommand {
    constructor(
        @InjectRepository(ChatParticipant) 
        private readonly partRepo: Repository<ChatParticipant>
    ) {}

    async execute(userId: number, chatId: number): Promise<void> {
        const participant = await this.partRepo.findOne({ 
            where: { chatId, userId } 
        });

        if (!participant) return; // Or throw error

        participant.lastReadAt = new Date();
        await this.partRepo.save(participant);
    }
}