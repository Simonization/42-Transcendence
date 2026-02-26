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

    @CreateDateColumn()
    createdAt: Date;
}