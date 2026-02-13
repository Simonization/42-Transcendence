import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ChatGateway } from './chat.gateway';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Chat } from './entities/chat.entity';
import { Message } from './entities/message.entity';
import { ChatParticipant } from './entities/chat-participant.entity';
import { User } from '../users/entities/user.entity';
import { Friend } from '../friends/entities/friend.entity';
import { UserSettings } from '../users/entities/user-settings.entity';

import { ChatController } from './chat.controller';
import { ChatPrivacyService } from './services/chat-privacy.service';

// Commands & Queries
import { StartConversationCommand } from './commands/start-conversation.command';
import { SendMessageCommand } from './commands/send-message.command';
import { EditMessageCommand } from './commands/edit-message.command';
import { DeleteMessageCommand } from './commands/delete-message.command';
import { LeaveGroupCommand } from './commands/leave-group.command';
import { MarkReadCommand } from './commands/mark-read.command';
import { CreateSystemChatCommand } from './commands/create-system-chat.command';
import { GetConversationsQuery } from './queries/get-conversations.query';
import { GetChatHistoryQuery } from './queries/get-chat-history.query';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Chat, 
      Message, 
      ChatParticipant, 
      User, 
      Friend, 
      UserSettings,
    ]),
    JwtModule.register({ secret: process.env.JWT_SECRET, }),
  ],
  controllers: [],
  providers: [
    ChatGateway,
    ChatPrivacyService,
    StartConversationCommand,
    SendMessageCommand,
    EditMessageCommand,
    DeleteMessageCommand,
    LeaveGroupCommand,
    MarkReadCommand,
    CreateSystemChatCommand,
    GetConversationsQuery,
    GetChatHistoryQuery,
  ],
  exports: [CreateSystemChatCommand]
})
export class ChatModule {}