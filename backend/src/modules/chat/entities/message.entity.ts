import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Chat } from './chat.entity';
import { User } from '../../users/entities/user.entity';

@Entity('messages')
export class Message {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: 'chat_id' })
    chatId: number;

    @Column({ name: 'sender_id' })
    senderId: number;

    @Column({ type: 'text' })
    content: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @Column({ name: 'edited_at', type: 'timestamp', nullable: true })
    editedAt: Date;

    @Column({ name: 'deleted_at', type: 'timestamp', nullable: true })
    deletedAt: Date | null;

    @ManyToOne(() => Chat, (chat) => chat.messages)
    @JoinColumn({ name: 'chat_id' })
    chat: Chat;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'sender_id' })
    sender: User;
}