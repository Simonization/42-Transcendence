import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Chat } from '../entities/chat.entity';
import { ChatParticipant } from '../entities/chat-participant.entity';
import { CreateChatDto } from '../dto/create-chat.dto';
import { ChatPrivacyService } from '../services/chat-privacy.service';

@Injectable()
export class StartConversationCommand {
    constructor(
       @InjectRepository(Chat) private readonly chatRepo: Repository<Chat>,
       @InjectRepository(ChatParticipant) private readonly partRepo: Repository<ChatParticipant>,
       private readonly privacyService: ChatPrivacyService,
    ) {}

    async execute(creatorId: number, dto: CreateChatDto) {
        if (!dto.participantIds || dto.participantIds.length === 0) {
            throw new BadRequestException('At least one participant is required');
        }
        for (const targetId of dto.participantIds) {
            await this.privacyService.validateAccess(creatorId, targetId);
        }

        const isPrivate = dto.participantIds.length === 1;
        if (isPrivate) {
            const targetId = dto.participantIds[0];
            const existingChat = await this.chatRepo.createQueryBuilder('chat')
                .innerJoin('chat.participants', 'p1', 'p1.userId = :creatorId', { creatorId })
                .innerJoin('chat.participants', 'p2', 'p2.userId = :targetId', { targetId })
                .where('chat.type = 0') 
                .getOne();

            if (existingChat) {
                return existingChat;
            }
        }

        const chatType = isPrivate ? 0 : 1;

        const chat = await this.chatRepo.save(
            this.chatRepo.create({ 
               type: chatType,
               title: isPrivate ? null : (dto.title || 'New Group')
            })
        );

        const allMemberIds = [creatorId, ...dto.participantIds];
        const participants = allMemberIds.map((id) =>
            this.partRepo.create({ chatId: chat.id, userId: id })
        );

        await this.partRepo.save(participants);
        return chat;
    }
}