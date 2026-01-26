// src/modules/users/entities/user.entity.ts

import { 
    Entity, 
    PrimaryGeneratedColumn, 
    Column, 
    CreateDateColumn, 
    OneToOne, 
    OneToMany, 
    JoinColumn 
} from 'typeorm';

import { UserProfile } from './user-profile.entity';
import { UserSettings } from './user-settings.entity';
import { UserGameAccount } from './user-game-account.entity';
import { Friend } from '../../friends/entities/friend.entity';
import { Block } from '../../friends/entities/block.entity';
import { RefreshToken } from './refresh-token.entity';

@Entity('users')
export class User {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ unique: true })
    username: string;

    @Column({ length: 100, unique: true })
    mail: string;

    @Column({ name: 'password_hash', select: false })
    passwordHash: string;

    @Column({ type: 'smallint', default: 0 })
    role: number;

    @Column({ type: 'smallint', default: 0 })
    status: number;

    @Column({ type: 'timestamp', name: 'ban_until', nullable: true })
    banUntil: Date;

    @Column({ default: false })
    isEmailVerified: boolean;

    @Column({ nullable: true, select: false })
    verificationToken?: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    // =====================
    // RELATIONSHIPS
    // =====================

    @OneToOne(() => UserProfile, (profile) => profile.user, { cascade: true })
    profile: UserProfile;

    @OneToOne(() => UserSettings, (settings) => settings.user, { cascade: true })
    settings: UserSettings;

    @OneToMany(() => UserGameAccount, (account) => account.user)
    gameAccounts: UserGameAccount[];

    @OneToMany(() => Friend, (friend) => friend.user)
    friends: Friend[];

    @OneToMany(() => Block, (block) => block.blocker)
    blockedUsers: Block[];

    @OneToMany(() => RefreshToken, (refreshToken) => refreshToken.user)
    refreshTokens: RefreshToken[];
}