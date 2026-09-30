// src/modules/matches/entities/match.entity.ts
import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    OneToMany,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { UserMatch } from './user-match.entity';
import { Game } from '../../games/entities/game.entity';
import { TournamentPhase } from '../../tournaments/entities/tournament-phase.entity';
import { Team } from '../../teams/entities/team.entity';

export enum MatchStatus {
    /** At least one slot is still waiting for a feeder match. */
    WAITING = 'WAITING',
    /** Both slots are filled; the teams can play and report. */
    READY = 'READY',
    ONGOING = 'ONGOING',
    /** One team reported a score; the other team has to confirm or dispute it. */
    AWAITING_CONFIRMATION = 'AWAITING_CONFIRMATION',
    /** The reported score was disputed; a global admin resolves it. */
    DISPUTED = 'DISPUTED',
    FINISHED = 'FINISHED',
    CANCELLED = 'CANCELLED',
    /** A first-round slot with a single team, which advances without playing. */
    BYE = 'BYE',
}

/** Statuses in which a match is settled and its winner (if any) has moved on. */
export const SETTLED_MATCH_STATUSES: readonly MatchStatus[] = [
    MatchStatus.FINISHED,
    MatchStatus.CANCELLED,
    MatchStatus.BYE,
];

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

    // Without the JoinColumn, TypeORM derives a second FK column ("phaseId") and the relation
    // reads that instead of phase_id, so generated matches were invisible to every query.
    // CASCADE: phases cascade from their tournament, so without it deleting a started
    // tournament hit this FK.
    @ManyToOne(() => TournamentPhase, (phase) => phase.matches, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'phase_id' })
    phase: TournamentPhase;

    @Column({ nullable: true })
    phase_id: number;

    /*
     * The two slots. These columns are the single source of truth for who plays: a slot has an
     * identity (1 or 2) that `winner_next_match_slot` writes into, which the old unordered
     * `match_teams` join table could not express.
     */
    @Column({ type: 'int', nullable: true })
    team1_id: number | null;

    @ManyToOne(() => Team, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'team1_id' })
    team1: Team | null;

    @Column({ type: 'int', nullable: true })
    team2_id: number | null;

    @ManyToOne(() => Team, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'team2_id' })
    team2: Team | null;

    @Column({ type: 'int', nullable: true })
    team1_score: number | null;

    @Column({ type: 'int', nullable: true })
    team2_score: number | null;

    @Column({ type: 'int', nullable: true })
    reported_by_team_id: number | null;

    @Column({ type: 'timestamp', nullable: true })
    reported_at: Date | null;

    @Column({ type: 'timestamp', nullable: true })
    finished_at: Date | null;

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

    @CreateDateColumn({ name: 'created_at' })
    created_at: Date;

    @OneToMany(() => UserMatch, (um) => um.match)
    userMatches: UserMatch[];

    @Column({ type: 'jsonb', nullable: true, default: {} })
    game_data: any;

    @Column({ type: 'int', nullable: true })
    winner_id: number | null;

    /** Display form of the score ("2-1"), kept in step with team1_score / team2_score. */
    @Column({ type: 'varchar', nullable: true })
    score: string | null;

    /** Round within the phase: 1 is the first round (knockout) or matchday (groups). */
    @Column({ nullable: true })
    round_order: number;

    /** Group stage only: 0 for group A, 1 for B, ... Null in knockout phases. */
    @Column({ type: 'int', nullable: true })
    group_index: number | null;
}
