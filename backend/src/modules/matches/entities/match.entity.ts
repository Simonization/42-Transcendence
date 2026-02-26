// src/modules/matches/entities/match.entity.ts
import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    OneToMany,
    ManyToOne,
    JoinColumn,
    ManyToMany,
    JoinTable
} from 'typeorm';
import { UserMatch } from './user-match.entity';
import { Game } from '../../games/entities/game.entity';
import { TournamentPhase } from 'src/modules/tournaments/entities/tournament-phase.entity';
import { Team } from 'src/modules/teams/entities/team.entity';

export enum MatchStatus {
    WAITING = 'WAITING',
    READY = 'READY',
    ONGOING = 'ONGOING',
    FINISHED = 'FINISHED',
    CANCELLED = 'CANCELLED',
    BYE = 'BYE'
}

@Entity('matches')
export class Match {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ nullable: true })
    game_id: number;

    @ManyToOne(() => Game, { nullable: true })
    @JoinColumn({ name: 'game_id' })
    game: Game;

    @Column({ nullable: true })
    tournament_id: number;

    @ManyToOne(() => TournamentPhase, (phase) => phase.matches)
    phase: TournamentPhase;

    @Column({ nullable: true })
    phase_id: number;

    @Column({ nullable: true })
    winner_next_match_id: number;

    @Column({ nullable: true })
    winner_next_match_slot: number;

    @Column({ nullable: true })
    loser_next_match_id: number;

    @Column({ nullable: true })
    loser_next_match_slot: number;

    @Column({ default: MatchStatus.WAITING })
    status: MatchStatus;

    @OneToMany(() => UserMatch, (um) => um.match)
    userMatches: UserMatch[];

    @ManyToMany(() => Team, (team) => team.matches)
    @JoinTable({
        name: 'match_teams',
        joinColumn: { name: 'match_id', referencedColumnName: 'id' },
        inverseJoinColumn: { name: 'team_id', referencedColumnName: 'id' }
    })
    teams: Team[];

    @Column({ type: 'jsonb', nullable: true, default: {} })
    game_data: any;

    @Column({ nullable: true })
    winner_id: number;

    @Column({ nullable: true })
    score: string;

    // Bracket round tracking (used by generators)
    @Column({ nullable: true })
    round_order: number;

    @CreateDateColumn()
    created_at: Date;
}