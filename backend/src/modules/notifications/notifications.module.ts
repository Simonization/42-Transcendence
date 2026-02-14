import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { Notification } from './entities/notification.entity';
import { Chat } from '../chat/entities/chat.entity';
import { Message } from '../chat/entities/message.entity';
import { ChatParticipant } from '../chat/entities/chat-participant.entity';
import { User } from '../users/entities/user.entity';
import { ChatModule } from '../chat/chat.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Notification,
      Chat,
      Message,
      ChatParticipant,
      User,
    ]),
    forwardRef(() => ChatModule),
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
