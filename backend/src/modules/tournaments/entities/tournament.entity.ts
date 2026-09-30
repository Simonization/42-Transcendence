import { Team } from "src/modules/teams/entities/team.entity";
import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { TournamentPhase } from "./tournament-phase.entity";

// FIX: enum instead of raw string — catches typos at compile time
export enum TournamentStatus {
    DRAFT = 'DRAFT',
    REGISTRATION_OPEN = 'REGISTRATION_OPEN',
    ONGOING = 'ONGOING',
    COMPLETED = 'COMPLETED'
}

@Entity('tournaments')
export class Tournament {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    name: string;

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({ nullable: true })
    max_participants: number;

    @Column({ 
        type: 'enum', 
        enum: TournamentStatus, 
        default: TournamentStatus.REGISTRATION_OPEN 
    })
    status: TournamentStatus;

    @Column({ default: 1 })
    current_phase_order: number;

    @OneToMany(() => TournamentPhase, (phase) => phase.tournament)
    phases: TournamentPhase[];

    @OneToMany(() => Team, (team) => team.tournament)
    teams: Team[];

    @Column({ nullable: true })
    active_phase_id: number;

    @ManyToOne(() => TournamentPhase)
    @JoinColumn({ name: 'active_phase_id' })
    activePhase: TournamentPhase;

    @Column({ type: 'timestamp', nullable: true })
    scheduledAt: Date | null;

    /** Registration is closed from this time on, whatever the status says. Null: no deadline. */
    @Column({ type: 'timestamp', nullable: true })
    registration_closes_at: Date | null;

    /** Check-in opens at this time and runs until start. Null: no check-in for this tournament. */
    @Column({ type: 'timestamp', nullable: true })
    checkin_opens_at: Date | null;

    /** Set when the last phase's final match finishes. */
    @Column({ type: 'timestamp', nullable: true })
    finished_at: Date | null;

    /**
     * Team ids in seed order (seed 1 first). Set by an admin before start; LOCKED teams missing
     * from it seed after the listed ones, by id. Frozen to the real entrants at start.
     */
    @Column({ type: 'jsonb', nullable: true })
    seed_order: number[] | null;

    @CreateDateColumn()
    createdAt: Date;
}