// src/modules/users/entities/user-profile.entity.ts

import { 
    Entity, 
    PrimaryColumn, 
    Column, 
    CreateDateColumn, 
    OneToOne, 
    JoinColumn 
} from 'typeorm';

import { User } from './user.entity';

@Entity('user_profiles')
export class UserProfile {
    @PrimaryColumn()
    userId: number;

    @Column({ name: 'display_name', nullable: true })
    displayName: string;

    @Column({ name: 'avatar_url', nullable: true })
    avatarUrl: string;

    @Column({ type: 'text', nullable: true })
    bio: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @OneToOne(() => User, (user) => user.profile)
    @JoinColumn({ name: 'user_id' })
    user: User;
}