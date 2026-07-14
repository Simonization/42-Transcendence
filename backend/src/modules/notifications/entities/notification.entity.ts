import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

// Types de notifications disponibles
export type NotificationType = 
  | 'info'
  | 'bot_message'
  | 'system'
  | 'friend_request'
  | 'friend_request_accepted'
  | 'team_invite'
  | 'tournament_started'
  | 'match_result';

// Destination de la notification
export enum NotificationDestination {
  BELL = 'bell',       // Uniquement dans la cloche (NotificationBell)
  CHAT = 'chat',       // Uniquement dans le chat bot
  BOTH = 'both'        // Dans la cloche ET le chat bot
}

@Entity({ name: 'notifications' })
export class Notification {
  @PrimaryGeneratedColumn()
  id: number | undefined;

  @Column({ name: 'user_id', type: 'int' })
  userId: number | undefined;

  @Column({ name: 'actor_id', type: 'int', nullable: true })
  actorId?: number | null;

  @Column({ type: 'varchar', length: 50 })
  type: NotificationType | undefined;

  @Column({ type: 'varchar', length: 255, nullable: true })
  title?: string | null;

  @Column({ type: 'text' })
  body: string | undefined;

  @Column({ type: 'json', nullable: true })
  data?: any;

  @Column({ name: 'read_at', type: 'timestamp', nullable: true })
  readAt?: Date | null;

  @Column({ name: 'delivered_at', type: 'timestamp', nullable: true })
  deliveredAt?: Date | null;

  @Column({ type: 'int', default: 0 })
  attempts: number = 0;

  @Column({ name: 'next_attempt_at', type: 'timestamp', nullable: true })
  nextAttemptAt?: Date | null;

  @Column({ name: 'last_error', type: 'text', nullable: true })
  lastError?: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date | undefined;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date | undefined;
}
