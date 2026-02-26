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
    order: number; // 1, 2, 3...

    @Column({
        type: 'enum',
        enum: ['SINGLE_ELIMINATION', 'DOUBLE_ELIMINATION', 'ROUND_ROBIN'],
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

    // This connects the phase to the matches it generates
    @OneToMany(() => Match, (match) => match.phase)
    matches: Match[];
}