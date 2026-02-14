import { IsOptional, IsEnum, IsBoolean, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import type { NotificationType } from '../entities/notification.entity';

export class QueryNotificationsDto {
  @IsEnum(['info', 'bot_message', 'system', 'friend_request', 'match_result'])
  @IsOptional()
  type?: NotificationType;

  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  unreadOnly?: boolean;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  page?: number = 1;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
