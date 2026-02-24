// src/modules/games/entities/game.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('games')
export class Game {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    name: string;

    @Column({ name: 'team_count', default: 2 })
    teamCount: number;

    @Column({ name: 'team_size' , default: 1 })
    teamSize: number;

    @CreateDateColumn()
    createdAt: Date;
}