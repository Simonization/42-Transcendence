import { Tournament } from "src/modules/tournaments/entities/tournament.entity";
import { User } from "src/modules/users/entities/user.entity";
import { Match } from "../../matches/entities/match.entity";
import { Column, Entity, JoinColumn, JoinTable, ManyToMany, ManyToOne, PrimaryGeneratedColumn } from "typeorm";

// src/modules/teams/entities/team.entity.ts
export enum TeamStatus {
    DRAFT = 'DRAFT',       // Still inviting people
    LOCKED = 'LOCKED',     // Captain clicked "Lock", ready for tournament
    ARCHIVED = 'ARCHIVED'  // Tournament is over
}

@Entity('teams')
export class Team {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    name: string;

    @Column({
        type: 'enum',
        enum: TeamStatus,
        default: TeamStatus.DRAFT
    })
    status: TeamStatus;

    // The person who can invite/kick/lock
    @ManyToOne(() => User)
    @JoinColumn({ name: 'captain_id' })
    captain: User;

    @Column()
    captain_id: number;

    // Many players can be in the team
    @ManyToMany(() => User, (user) => user.teams)
    @JoinTable({
        name: 'team_members',
        joinColumn: { name: 'team_id', referencedColumnName: 'id' },
        inverseJoinColumn: { name: 'user_id', referencedColumnName: 'id' }
    })
    members: User[];

    @ManyToOne(() => Match, (match) => match.teams, { nullable: true })
    match: Match;

    // This links the team to the tournament, not just a single match
    @ManyToOne(() => Tournament, (t) => t.teams, { nullable: true })
    tournament: Tournament;
}
