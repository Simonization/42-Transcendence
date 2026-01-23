import {
    Entity,
    PrimaryGeneratedColumn,
    ManyToOne
} from 'typeorm';

import { User } from '../../users/entities/user.entity';

@Entity('friends')
export class Friend {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => User, (user) => user.friends)
    user: User;

    @ManyToOne(() => User)
    friend: User;
}