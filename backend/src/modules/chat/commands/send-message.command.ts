import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Chat } from '../entities/chat.entity';
import { Message } from '../entities/message.entity';
import { ChatParticipant } from '../entities/chat-participant.entity';
import { SendMessageDto } from '../dto/send-message.dto';
import { ChatPrivacyService } from '../services/chat-privacy.service';
import { ChatGateway } from '../chat.gateway';
import { BOT_USER_ID } from '../../notifications/constants/notification.constants';

@Injectable()
export class SendMessageCommand {
    constructor(
        @InjectRepository(Chat) private readonly chatRepo: Repository<Chat>,
        @InjectRepository(Message) private readonly messageRepo: Repository<Message>,
        @InjectRepository(ChatParticipant) private readonly partRepo: Repository<ChatParticipant>,
        private readonly privacyService: ChatPrivacyService,
        private readonly chatGateway: ChatGateway,
    ) {}

    async execute(senderId: number, dto: SendMessageDto) {
        const isMember = await this.partRepo.findOne({ 
            where: { chatId: dto.chatId, userId: senderId } 
        });

        if (!isMember) {
            throw new ForbiddenException('You are not a member of this chat');
        }

        const participants = await this.partRepo.find({
            where: { chatId: dto.chatId }
        });
        const participantIds = participants.map(p => p.userId);

        // Privacy was only checked when the room was created, so a later block or unfriend did
        // not stop messages in a room that already existed. Group rooms have no single
        // counterparty to check, and the notification bot is exempt so its DM stays usable.
        const others = participantIds.filter(id => id !== senderId);
        if (others.length === 1 && others[0] !== BOT_USER_ID) {
            await this.privacyService.validateAccess(senderId, others[0]);
        }

        const message = this.messageRepo.create({
            chatId: dto.chatId,
            senderId: senderId,
            content: dto.content,
        });
        const savedMessage = await this.messageRepo.save(message);
        this.chatGateway.broadcastToUsers(participantIds, 'newMessage', savedMessage);

        return savedMessage;
    }
}