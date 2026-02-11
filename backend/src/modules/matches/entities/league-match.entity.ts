// src/modules/matches/entities/league-match.entity.ts
import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('league_matches')
export class LeagueMatch {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'json' })
    data: any;
}