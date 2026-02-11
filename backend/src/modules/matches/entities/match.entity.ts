// src/modules/matches/entities/match.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany } from 'typeorm';
import { UserMatch } from './user-match.entity';

export enum GameType {
    CHESS = 1,
    LEAGUE = 2,
}

@Entity('matches')
export class Match {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'smallint' })
    game_type: GameType;

    @Column()
    game_match_id: number;

    @Column({ nullable: true })
    tournament_id: number;

    @CreateDateColumn({ name: 'created_at' })
    created_at: Date;

    // New relationship replacing ManyToMany
    @OneToMany(() => UserMatch, (userMatch) => userMatch.match)
    userMatches: UserMatch[];
}