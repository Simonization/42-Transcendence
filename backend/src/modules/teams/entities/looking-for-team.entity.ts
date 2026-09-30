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
import { Tournament } from '../../tournaments/entities/tournament.entity';

/**
 * "Looking for team" board entry: a user flags themselves as available for a given
 * tournament, with an optional short note. Removed automatically once they join a team
 * there (see TeamMembershipService.clearLookingForTeam).
 */
@Entity('looking_for_team')
@Unique(['userId', 'tournamentId'])
export class LookingForTeam {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: 'user_id' })
    userId: number;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: User;

    @Column({ name: 'tournament_id' })
    tournamentId: number;

    @ManyToOne(() => Tournament, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'tournament_id' })
    tournament: Tournament;

    @Column({ type: 'varchar', length: 140, nullable: true })
    note: string | null;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
}
