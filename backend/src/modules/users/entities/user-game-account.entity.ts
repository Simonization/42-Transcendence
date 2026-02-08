// src/modules/users/entities/user-game-account.entity.ts

import { 
    Entity, 
    PrimaryGeneratedColumn, 
    Column, 
    ManyToOne, 
    JoinColumn,
    Index 
} from 'typeorm';

import { User } from './user.entity';

@Entity('user_game_accounts')
@Index(['game', 'gameAccountId'], { unique: true })
export class UserGameAccount {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column()
  game: string;

  @Column({ name: 'game_account_id' })
  gameAccountId: string;

  @Column({ name: 'game_username' })
  gameUsername: string;

  @Column({ nullable: true })
  region: string;

  @Column({ type: 'timestamp', name: 'linked_at', default: () => 'CURRENT_TIMESTAMP' })
  linkedAt: Date;

  @ManyToOne(() => User, (user) => user.gameAccounts)
  @JoinColumn({ name: 'user_id' })
  user: User;
}