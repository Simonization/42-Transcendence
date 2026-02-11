import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('chess_matches')
export class ChessMatch {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    white_user_id: number;

    @Column()
    black_user_id: number;

    @Column({ nullable: true })
    winner_user_id: number;

    @Column({ type: 'text' })
    moves: string; // Stored as PGN string
}