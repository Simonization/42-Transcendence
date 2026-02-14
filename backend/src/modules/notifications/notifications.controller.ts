import { 
  Controller, 
  Get, 
  Post, 
  Delete, 
  Param, 
  Query, 
  Body,
  UseGuards,
  Request,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { CreateNotificationDto, QueryNotificationsDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async getNotifications(
    @Request() req,
    @Query() query: QueryNotificationsDto,
  ) {
    const userId = req.user.sub;
    return this.notificationsService.getUserNotifications(userId, query);
  }

  @Get('unread-count')
  async getUnreadCount(@Request() req) {
    const userId = req.user.sub;
    const count = await this.notificationsService.getUnreadCount(userId);
    return { count };
  }

  //mark notif :id as read
  @Post(':id/read')
  @HttpCode(HttpStatus.NO_CONTENT)
  async markAsRead(
    @Request() req,
    @Param('id', ParseIntPipe) notificationId: number,
  ) {
    const userId = req.user.sub;
    await this.notificationsService.markAsRead(notificationId, userId);
  }

  //mark all notif as read
  @Post('read-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  async markAllAsRead(@Request() req) {
    const userId = req.user.sub;
    await this.notificationsService.markAllAsRead(userId);
  }

  //delete notif :id
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteNotification(
    @Request() req,
    @Param('id', ParseIntPipe) notificationId: number,
  ) {
    const userId = req.user.sub;
    await this.notificationsService.deleteNotification(notificationId, userId);
  }

  // manuel send notif is on for tests, MUST BE REMOVED WHEN DONE
  @Post('send')
  async sendNotification(
    @Body() createNotificationDto: CreateNotificationDto,
  ) {
    return this.notificationsService.sendNotification(
      createNotificationDto.userId,
      createNotificationDto.type,
      createNotificationDto.body,
      createNotificationDto.title,
      createNotificationDto.data,
    );
  }
}
