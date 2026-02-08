import {
    Entity,
    PrimaryGeneratedColumn,
    ManyToOne,
    Column,
    CreateDateColumn
} from 'typeorm';

import { User } from '../../users/entities/user.entity';

@Entity('user_blocks')
export class Block {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => User, (user) => user.blockedUsers)
    blocker: User;

    @ManyToOne(() => User)
    blocked: User;

    @Column({ type: 'varchar', nullable: true })
    reason: string;

    @CreateDateColumn()
    createdAt: Date;
}