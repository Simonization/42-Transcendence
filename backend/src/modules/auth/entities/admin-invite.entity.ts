import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn
} from 'typeorm';

@Entity('admin_invites')
export class AdminInvite {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: 'token_hash', unique: true })
    tokenHash: string;

    @Column({ name: 'created_by_user_id', nullable: true })
    createdByUserId?: number;

    @Column({ name: 'used_by_user_id', nullable: true })
    usedByUserId?: number;

    @Column({ type: 'timestamp', name: 'expires_at' })
    expiresAt: Date;

    @Column({ type: 'timestamp', name: 'used_at', nullable: true })
    usedAt?: Date;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
}
