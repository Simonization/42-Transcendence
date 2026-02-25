import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Team } from "./team.entity";
import { User } from "src/modules/users/entities/user.entity";

@Entity('team_invitations')
export class TeamInvitation {
    @PrimaryGeneratedColumn()
    id: number;

    // Define the raw ID column
    @Column()
    team_id: number;

    // Link it to the relation
    @ManyToOne(() => Team)
    @JoinColumn({ name: 'team_id' })
    team: Team;

    @Column()
    sender_id: number;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'sender_id' })
    sender: User;

    @Column()
    receiver_id: number;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'receiver_id' })
    receiver: User;

    @Column({ default: 'PENDING' })
    status: string; // 'PENDING' | 'ACCEPTED' | 'DECLINED'
}