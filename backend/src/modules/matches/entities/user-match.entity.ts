import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Match } from './match.entity';
import { Team } from '../../teams/entities/team.entity';
import { UserMatchResult } from '../dto/create-match.dto';

@Entity('users_matches')
export class UserMatch {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: 'user_id' })
    user_id: number;

    @Column({ name: 'match_id' })
    match_id: number;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'user_id' })
    user: User;

    @ManyToOne(() => Match, (match) => match.userMatches, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'match_id' })
    match: Match;

    @Column({ name: 'team_id', nullable: true })
    team_id: number;

    @ManyToOne(() => Team)
    @JoinColumn({ name: 'team_id' })
    team: Team;

    @Column({ 
        type: 'enum', 
        enum: UserMatchResult, 
        default: UserMatchResult.PENDING 
    })
    result: UserMatchResult;
}