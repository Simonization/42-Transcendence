import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatParticipant } from '../entities/chat-participant.entity';

@Injectable()
export class LeaveGroupCommand {
    constructor(
        @InjectRepository(ChatParticipant) private readonly partRepo: Repository<ChatParticipant>
    ) {}

    async execute(userId: number, chatId: number): Promise<void> {
        const participant = await this.partRepo.findOne({ where: { chatId, userId } });

        if (!participant) {
            throw new NotFoundException('You are not a member of this chat');
        }

        await this.partRepo.remove(participant);
    }
}