import { Game } from "src/modules/games/entities/game.entity";
import { Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, Column } from "typeorm";
import { Tournament } from "./tournament.entity";
import { Match } from "src/modules/matches/entities/match.entity";

@Entity('tournament_phases')
export class TournamentPhase {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    tournament_id: number;

    @Column()
    order: number;

    @Column({
        type: 'enum',
        enum: ['SINGLE_ELIMINATION', 'DOUBLE_ELIMINATION', 'ROUND_ROBIN', 'SWISS', 'GROUP_STAGE'],
        default: 'SINGLE_ELIMINATION'
    })
    type: string;

    @ManyToOne(() => Tournament, (t) => t.phases, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'tournament_id' })
    tournament: Tournament;

    @ManyToOne(() => Game)
    @JoinColumn({ name: 'game_id' })
    game: Game;

    @Column()
    game_id: number;

    @OneToMany(() => Match, (match) => match.phase)
    matches: Match[];

    @Column({ type: 'int', nullable: true })
    teams_limit_start: number;

    @Column({ type: 'int', nullable: true })
    teams_limit_end: number;

    // --- New Parameters ---
    
    @Column({ type: 'int', nullable: true })
    swiss_rounds: number;

    @Column({ type: 'int', nullable: true })
    group_size: number;

    @Column({ type: 'int', nullable: true })
    group_winners_count: number;
}