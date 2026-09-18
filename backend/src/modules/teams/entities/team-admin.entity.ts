import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
    Unique,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Team } from './team.entity';

/**
 * An explicit admin grant, separate from `Team.members`. The captain is always an admin by
 * virtue of `Team.captain_id` and has no row here, so the founder's rights cannot be revoked.
 */
@Entity('team_admins')
@Unique(['userId', 'teamId'])
export class TeamAdmin {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: 'user_id' })
    userId: number;

    @Column({ name: 'team_id' })
    teamId: number;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: User;

    @ManyToOne(() => Team, (team) => team.admins, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'team_id' })
    team: Team;

    @Column({ name: 'granted_by' })
    grantedBy: number;

    @CreateDateColumn({ name: 'granted_at' })
    grantedAt: Date;
}
