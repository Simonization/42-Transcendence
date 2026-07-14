import { Entity, Column, PrimaryColumn, CreateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('friends')
@Index(['user1', 'user2'], { unique: true })
export class Friend {
    @PrimaryColumn()
    user1: number;

    @PrimaryColumn()
    user2: number;

    @Column({ type: 'smallint', default: 0 }) // 0=pending, 1=accepted, 2=blocked
    status: number;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @Column({ default: 0 }) 
    actionUserId: number;

    // Optional: Keep these if you want to load User objects later
    @ManyToOne(() => User)
    @JoinColumn({ name: 'user1' })
    user1Entity: User;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'user2' })
    user2Entity: User;
}