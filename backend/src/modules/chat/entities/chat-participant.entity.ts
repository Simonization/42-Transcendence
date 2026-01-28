import { Entity, PrimaryColumn, CreateDateColumn, ManyToOne, JoinColumn, Column } from 'typeorm';
import { Chat } from './chat.entity';
import { User } from '../../users/entities/user.entity';

@Entity('chat_participants')
export class ChatParticipant {
    @PrimaryColumn({ name: 'chat_id' })
    chatId: number;

    @PrimaryColumn({ name: 'user_id' })
    userId: number;

    @CreateDateColumn({ name: 'joined_at' })
    joinedAt: Date;

    @Column({ name: 'last_read_at', type: 'timestamp', nullable: true })
    lastReadAt: Date; 

    @ManyToOne(() => Chat, (chat) => chat.participants)
    @JoinColumn({ name: 'chat_id' })
    chat: Chat;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'user_id' })
    user: User;
}