// src/modules/users/entities/user-settings.entity.ts

import { 
    Entity, 
    PrimaryColumn, 
    Column,
    OneToOne,
    CreateDateColumn,
    JoinColumn
} from 'typeorm';

import { User } from './user.entity';

@Entity('user_settings')
export class UserSettings {
    @PrimaryColumn({ name: 'user_id' })
    userId: number;

    @Column({ length: 10, default: 'en' })
    language: string;

    @Column({ length: 50, nullable: true })
    timezone: string;

    @Column({ type: 'smallint', default: 0 })
    theme: number;

    @Column({ default: false} )
    openMessage: boolean;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @OneToOne(() => User, (user) => user.settings)
    @JoinColumn({ name: 'user_id' })
    user: User;
}