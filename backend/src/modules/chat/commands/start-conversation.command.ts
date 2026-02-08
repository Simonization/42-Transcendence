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
       if (!dto.userIds || dto.userIds.length === 0) {
           throw new BadRequestException('At least one participant is required');
       }

       for (const targetId of dto.userIds) {
           await this.privacyService.validateAccess(creatorId, targetId);
       }

       const isPrivate = dto.userIds.length === 1;
       const chatType = isPrivate ? 0 : 1;

       const chat = await this.chatRepo.save(
           this.chatRepo.create({ 
              type: chatType,
              // If it's a DM, title remains null. If it's a group, we use the DTO title.
              title: isPrivate ? null : (dto.title || 'New Group')
           })
       );

       const allMemberIds = [creatorId, ...dto.userIds];
       const participants = allMemberIds.map((id) =>
           this.partRepo.create({ chatId: chat.id, userId: id })
       );

       await this.partRepo.save(participants);
       return chat;
    }
}