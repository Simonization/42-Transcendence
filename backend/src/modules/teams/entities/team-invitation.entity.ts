import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Team } from "./team.entity";
import { User } from "src/modules/users/entities/user.entity";

export enum InvitationStatus {
    PENDING = 'PENDING',
    ACCEPTED = 'ACCEPTED',
    DECLINED = 'DECLINED'
}

@Entity('team_invitations')
export class TeamInvitation {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    team_id: number;

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

    @Column({
        type: 'enum',
        enum: InvitationStatus,
        default: InvitationStatus.PENDING
    })
    status: InvitationStatus;
}