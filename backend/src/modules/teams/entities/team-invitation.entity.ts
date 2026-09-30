import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Team } from "./team.entity";
import { User } from "src/modules/users/entities/user.entity";

export enum InvitationStatus {
    PENDING = 'PENDING',
    ACCEPTED = 'ACCEPTED',
    DECLINED = 'DECLINED',
    CANCELLED = 'CANCELLED'
}

export enum InvitationDirection {
    /** A team admin invited a user. `receiver_id` is the invited user. */
    INVITE = 'INVITE',
    /** A user asked to join a team. `receiver_id` is a snapshot of the captain at request time —
     * permission to act on it is always rechecked against the team's *current* captain/admins. */
    REQUEST = 'REQUEST'
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

    @Column({
        type: 'enum',
        enum: InvitationDirection,
        default: InvitationDirection.INVITE
    })
    direction: InvitationDirection;

    /** Optional short note attached to a REQUEST (why the user wants in). Unused for INVITE. */
    @Column({ type: 'varchar', length: 140, nullable: true })
    note: string | null;
}