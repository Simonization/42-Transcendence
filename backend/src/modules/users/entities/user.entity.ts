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

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    // =====================
    // RELATIONSHIPS
    // =====================

    // 1:1 Relationship with Profiles
    @OneToOne(() => UserProfile, (profile) => profile.user, { cascade: true })
    profile: UserProfile;

    // 1:1 Relationship with Settings
    @OneToOne(() => UserSettings, (settings) => settings.user, { cascade: true })
    settings: UserSettings;

    // 1:N Relationship with Game Accounts (League, Chess, etc.)
    @OneToMany(() => UserGameAccount, (account) => account.user)
    gameAccounts: UserGameAccount[];
}