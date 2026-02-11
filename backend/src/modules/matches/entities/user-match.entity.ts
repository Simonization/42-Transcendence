// src/modules/matches/entities/user-match.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Match } from './match.entity';

@Entity('users_matches')
export class UserMatch {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: 'user_id' })
    userId: number;

    @Column({ name: 'match_id' })
    matchId: number;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'user_id' })
    user: User;

    @ManyToOne(() => Match, (match) => match.userMatches, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'match_id' })
    match: Match;

    @Column({ nullable: true })
    team_id: number; // e.g., 1 for Blue, 2 for Red

    @Column({ type: 'varchar', length: 10 })
    result: 'WIN' | 'LOSS' | 'DRAW' | 'PENDING';
}