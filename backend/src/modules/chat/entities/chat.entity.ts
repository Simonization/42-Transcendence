import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany } from 'typeorm';
import { ChatParticipant } from './chat-participant.entity';
import { Message } from './message.entity';

@Entity('chats')
export class Chat {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'smallint', default: 0 }) 
    type: number;

    @Column({ type: 'varchar', nullable: true })
    title: string | null;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @OneToMany(() => ChatParticipant, (participant) => participant.chat)
    participants: ChatParticipant[];

    @OneToMany(() => Message, (message) => message.chat)
    messages: Message[];
}