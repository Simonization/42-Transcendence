import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Notification,
  NotificationType,
  NotificationDestination,
} from './entities/notification.entity';
import { Chat } from '../chat/entities/chat.entity';
import { Message } from '../chat/entities/message.entity';
import { ChatParticipant } from '../chat/entities/chat-participant.entity';
import { User } from '../users/entities/user.entity';
import { ChatGateway } from '../chat/chat.gateway';
import {
  BOT_USER_ID,
  MAX_NOTIFICATION_ATTEMPTS,
  RETRY_DELAY_MS,
} from './constants/notification.constants';
import { QueryNotificationsDto } from './dto';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,

    @InjectRepository(Chat)
    private readonly chatRepository: Repository<Chat>,

    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,

    @InjectRepository(ChatParticipant)
    private readonly chatParticipantRepository: Repository<ChatParticipant>,

    @InjectRepository(User)
    private readonly userRepository: Repository<User>,

    @Inject(forwardRef(() => ChatGateway))
    private readonly chatGateway: ChatGateway,
  ) {}

  async getOrCreateBotChat(userId: number): Promise<Chat> {
    // try to find existing bot chat
    const existingChat = await this.chatRepository
      .createQueryBuilder('chat')
      .innerJoin('chat.participants', 'p1', 'p1.userId = :botId', {
        botId: BOT_USER_ID,
      })
      .innerJoin('chat.participants', 'p2', 'p2.userId = :userId', { userId })
      .where('chat.type = :type', { type: 0 }) //direct chat
      .getOne();

    if (existingChat) {
      return existingChat;
    }

    // create new bot chat
    const newChat = await this.chatRepository.save({
      type: 0, // direct chat
      title: null,
    });

    // add bot and user in chat
    await this.chatParticipantRepository.save([
      {
        chatId: newChat.id,
        userId: BOT_USER_ID,
      },
      {
        chatId: newChat.id,
        userId: userId,
      },
    ]);

    return newChat;
  }

  /**
   * Send notification to chat bot (private message)
   */
  private async sendToChatBot(
    userId: number,
    body: string,
    notification: Notification,
  ): Promise<void> {
    try {
      // create bot chat
      const botChat = await this.getOrCreateBotChat(userId);

      // create message in chat
      const message = await this.messageRepository.save({
        chatId: botChat.id,
        senderId: BOT_USER_ID,
        content: body,
      });

      // emit message event via WebSocket
      this.chatGateway.server.to(`user_${userId}`).emit('message', {
        id: message.id,
        chatId: botChat.id,
        senderId: BOT_USER_ID,
        content: body,
        createdAt: message.createdAt,
        editedAt: message.editedAt,
        deletedAt: null,
      });

      // mark as delivered
      if (notification.id) {
        await this.notificationRepository.update(notification.id, {
          deliveredAt: new Date(),
        });
      }
    } catch (error) {
      console.error('Failed to send to chat bot:', error);
      // notification is saved in db for retry
    }
  }

  /**
   * Send notification to notification bell (WebSocket event)
   */
  private async sendToNotificationBell(
    userId: number,
    notification: Notification,
    type: NotificationType,
    title: string | undefined,
    body: string,
    data: any,
  ): Promise<void> {
    try {
      // emit notification event via WebSocket
      this.chatGateway.server.to(`user_${userId}`).emit('notification', {
        id: notification.id,
        type,
        title,
        body,
        data,
        createdAt: notification.createdAt,
        readAt: null,
      });

      // mark as delivered
      if (notification.id) {
        await this.notificationRepository.update(notification.id, {
          deliveredAt: new Date(),
        });
      }
    } catch (error) {
      console.error('Failed to send to notification bell:', error);
      // notification is saved in db for retry
    }
  }

  async sendNotification(
    userId: number,
    type: NotificationType,
    body: string,
    title?: string,
    data?: any,
    destination: NotificationDestination = NotificationDestination.BOTH,
  ): Promise<Notification> {
    // check userid number to avoid postgresql overflow
    if (!Number.isInteger(userId) || userId < 1 || userId > 2147483647) {
      throw new NotFoundException(`Invalid user ID: ${userId}`);
    }

    // check if user exists
    const userExists = await this.userRepository.existsBy({ id: userId });
    if (!userExists) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    try {
      // create notification in database (always, for history)
      const notification = await this.notificationRepository.save({
        userId,
        actorId: BOT_USER_ID,
        type,
        title,
        body,
        data,
        attempts: 0,
      });

      // Send to chat bot if destination includes CHAT
      if (
        destination === NotificationDestination.CHAT ||
        destination === NotificationDestination.BOTH
      ) {
        await this.sendToChatBot(userId, body, notification);
      }

      // Send to notification bell if destination includes BELL
      if (
        destination === NotificationDestination.BELL ||
        destination === NotificationDestination.BOTH
      ) {
        await this.sendToNotificationBell(
          userId,
          notification,
          type,
          title,
          body,
          data,
        );
      }

      return notification;
    } catch (error) {
      console.error('Failed to send notification:', error);

      // save error for retry
      await this.notificationRepository.save({
        userId,
        actorId: BOT_USER_ID,
        type,
        title,
        body,
        data,
        attempts: 1,
        lastError: error instanceof Error ? error.message : 'Unknown error',
        nextAttemptAt: new Date(Date.now() + RETRY_DELAY_MS),
      });

      throw error;
    }
  }

  //set notification as read
  async markAsRead(notificationId: number, userId: number): Promise<void> {
    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    if (notification.userId !== userId) {
      throw new ForbiddenException(
        'You can only mark your own notifications as read',
      );
    }

    if (!notification.id) {
      throw new Error('Notification ID is undefined');
    }

    await this.notificationRepository.update(notification.id, {
      readAt: new Date(),
    });
  }

  async markAllAsRead(userId: number): Promise<void> {
    await this.notificationRepository
      .createQueryBuilder()
      .update(Notification)
      .set({ readAt: new Date() })
      .where('userId = :userId', { userId })
      .andWhere('readAt IS NULL')
      .execute();
  }

  async getUserNotifications(
    userId: number,
    query: QueryNotificationsDto,
  ): Promise<{ notifications: Notification[]; total: number }> {
    const { type, unreadOnly, page = 1, limit = 20 } = query;

    const queryBuilder = this.notificationRepository
      .createQueryBuilder('notification')
      .where('notification.userId = :userId', { userId })
      .orderBy('notification.createdAt', 'DESC');

    if (type) {
      queryBuilder.andWhere('notification.type = :type', { type });
    }

    if (unreadOnly) {
      queryBuilder.andWhere('notification.readAt IS NULL');
    }

    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    const [notifications, total] = await queryBuilder.getManyAndCount();

    return { notifications, total };
  }

  //unread notifs count
  async getUnreadCount(userId: number): Promise<number> {
    return this.notificationRepository
      .createQueryBuilder('notification')
      .where('notification.userId = :userId', { userId })
      .andWhere('notification.readAt IS NULL')
      .getCount();
  }

  // delete notif
  async deleteNotification(
    notificationId: number,
    userId: number,
  ): Promise<void> {
    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    if (notification.userId !== userId) {
      throw new ForbiddenException(
        'You can only delete your own notifications',
      );
    }

    if (!notification.id) {
      throw new Error('Notification ID is undefined');
    }

    await this.notificationRepository.delete(notification.id);
  }

  //retry notif failed before (get from db)
  async retryFailedNotifications(): Promise<void> {
    const failedNotifications = await this.notificationRepository
      .createQueryBuilder('notification')
      .where('notification.deliveredAt IS NULL')
      .andWhere('notification.attempts < :maxAttempts', {
        maxAttempts: MAX_NOTIFICATION_ATTEMPTS,
      })
      .andWhere('notification.nextAttemptAt <= :now', { now: new Date() })
      .getMany();

    for (const notification of failedNotifications) {
      if (!notification.userId || !notification.type || !notification.body) {
        continue; // continue if notif wasn't valid
      }

      try {
        await this.sendNotification(
          notification.userId,
          notification.type,
          notification.body,
          notification.title ?? undefined,
          notification.data,
        );

        // delete if retry success
        if (notification.id) {
          await this.notificationRepository.delete(notification.id);
        }
      } catch (error) {
        // increment attempts (set in notification.constants.ts)
        if (notification.id) {
          await this.notificationRepository.update(notification.id, {
            attempts: notification.attempts + 1,
            lastError: error instanceof Error ? error.message : 'Unknown error',
            nextAttemptAt: new Date(
              Date.now() + RETRY_DELAY_MS * (notification.attempts + 1),
            ),
          });
        }
      }
    }
  }
}
