import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Message } from '../entities/message.entity';
import { EditMessageDto } from '../dto/edit-message.dto';

@Injectable()
export class EditMessageCommand {
    constructor(
        @InjectRepository(Message) private readonly messageRepo: Repository<Message>
    ) {}

    async execute(userId: number, messageId: number, dto: EditMessageDto) {
        const message = await this.messageRepo.findOne({ where: { id: messageId } });

        if (!message) throw new NotFoundException('Message not found');
        
        // Security: Only the sender can edit
        if (message.senderId !== userId) {
            throw new ForbiddenException('You can only edit your own messages');
        }

        message.content = dto.content;
        message.editedAt = new Date();

        return await this.messageRepo.save(message);
    }
}