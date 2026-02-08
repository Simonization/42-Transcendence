import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Chat } from '../entities/chat.entity';
import { Message } from '../entities/message.entity';
import { ChatParticipant } from '../entities/chat-participant.entity';
import { SendMessageDto } from '../dto/send-message.dto';
import { ChatPrivacyService } from '../services/chat-privacy.service';

@Injectable()
export class SendMessageCommand {
    constructor(
        @InjectRepository(Chat) private readonly chatRepo: Repository<Chat>,
        @InjectRepository(Message) private readonly messageRepo: Repository<Message>,
        @InjectRepository(ChatParticipant) private readonly partRepo: Repository<ChatParticipant>,
        private readonly privacyService: ChatPrivacyService,
    ) {}

    async execute(senderId: number, dto: SendMessageDto) {
        const isMember = await this.partRepo.findOne({ 
            where: { chatId: dto.chatId, userId: senderId } 
        });

        if (!isMember) {
            throw new ForbiddenException('You are not a member of this chat');
        }

        const message = this.messageRepo.create({
            chatId: dto.chatId,
            senderId: senderId,
            content: dto.content,
        });

        return await this.messageRepo.save(message);
    }
}