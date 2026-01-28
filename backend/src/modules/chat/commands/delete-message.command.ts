import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Message } from '../entities/message.entity';

@Injectable()
export class DeleteMessageCommand {
    constructor(
        @InjectRepository(Message) private readonly messageRepo: Repository<Message>
    ) {}

    async execute(userId: number, messageId: number): Promise<void> {
        const message = await this.messageRepo.findOne({ where: { id: messageId } });

        if (!message) throw new NotFoundException('Message not found');

        // Security: Only the sender or an Admin (if you add that later) can delete
        if (message.senderId !== userId) {
            throw new ForbiddenException('You can only delete your own messages');
        }

        message.deletedAt = new Date();
        message.content = 'This message was deleted'; // Optional: clear content
        
        await this.messageRepo.save(message);
    }
}