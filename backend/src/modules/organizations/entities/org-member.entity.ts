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
import { Organization } from './organization.entity';

@Entity('org_members')
@Unique(['userId', 'orgId'])
export class OrgMember {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: 'user_id' })
    userId: number;

    @Column({ name: 'org_id' })
    orgId: number;

    @Column({ default: 'member' })
    role: string; // 'owner' | 'admin' | 'member'

    @ManyToOne(() => User)
    @JoinColumn({ name: 'user_id' })
    user: User;

    @ManyToOne(() => Organization, (org) => org.members, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'org_id' })
    organization: Organization;

    @CreateDateColumn({ name: 'joined_at' })
    joinedAt: Date;
}
