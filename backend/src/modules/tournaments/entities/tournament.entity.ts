import { Team } from "src/modules/team/entities/team.entity";
import { CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { Column } from "typeorm/browser";

@Entity('tournaments')
export class Tournament {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    name: string;

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({ nullable: true })
    max_participants: number; // e.g., 64 teams

    @Column({ default: 'REGISTRATION_OPEN' })
    status: string; // DRAFT, REGISTRATION_OPEN, ONGOING, COMPLETED

    @OneToMany(() => TournamentPhase, (phase) => phase.tournament)
    phases: TournamentPhase[];

    @OneToMany(() => Team, (team) => team.tournament)
    teams: Team[];

    @CreateDateColumn()
    createdAt: Date;
}