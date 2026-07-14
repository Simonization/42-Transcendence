import { IsString, IsEnum, IsOptional, IsInt, Min, Max, IsObject } from 'class-validator';
import type { NotificationType } from '../entities/notification.entity';
import { NotificationDestination } from '../entities/notification.entity';

export class CreateNotificationDto {
  @IsInt()
  @Min(1)
  @Max(2147483647)
  userId: number;

  @IsEnum([
    'info', 'bot_message', 'system',
    'friend_request', 'friend_request_accepted',
    'team_invite',
    'tournament_started',
    'match_result'
  ])
  type: NotificationType;

  @IsString()
  body: string;

  @IsString()
  @IsOptional()
  title?: string;

  @IsObject()
  @IsOptional()
  data?: any;

  @IsInt()
  @Min(1)
  @Max(2147483647)
  @IsOptional()
  actorId?: number;

  @IsEnum(NotificationDestination)
  @IsOptional()
  destination?: NotificationDestination;
}
