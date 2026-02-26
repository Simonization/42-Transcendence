// src/modules/matches/entities/match.entity.ts
import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    OneToMany,
    ManyToOne,
    JoinColumn
} from 'typeorm';
import { UserMatch } from './user-match.entity';
import { Game } from '../../games/entities/game.entity';
import { TournamentPhase } from 'src/modules/tournaments/entities/tournament-phase.entity';
import { Team } from 'src/modules/teams/entities/team.entity';

export enum GameType {
    CHESS = 'CHESS',
    LEAGUE = 'LEAGUE',
}

@Entity('matches')
export class Match {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'enum', enum: GameType, nullable: true })
    game_type: GameType;

    @Column({ nullable: true })
    game_match_id: number;

    @Column({ nullable: true })
    tournament_id: number;

    @ManyToOne(() => TournamentPhase, (phase) => phase.matches)
    phase: TournamentPhase;

    // For Brackets: Where does the winner go?
    @Column({ nullable: true })
    winner_next_match_id: number;

    // Which "slot" in the next match (e.g., Team A or Team B)
    @Column({ nullable: true })
    winner_next_match_slot: number;

    // For Brackets: Where does the winner go?
    @Column({ nullable: true })
    loser_next_match_id: number;

    // Which "slot" in the next match (e.g., Team A or Team B)
    @Column({ nullable: true })
    loser_next_match_slot: number

    @Column({ default: 'WAITING' })
    status: string; // WAITING, READY, LIVE, FINISHED

    @OneToMany(() => UserMatch, (um) => um.match)
    userMatches: UserMatch[];

    @OneToMany(() => Team, (team) => team.match)
    teams: Team[];
}