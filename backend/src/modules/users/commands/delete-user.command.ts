import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';

@Injectable()
export class DeleteUserCommand {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async execute(userId: number): Promise<void> {
    // 1. Find the user first
    const user = await this.userRepository.findOneBy({ id: userId });
    
    if (!user) {
      throw new NotFoundException(`User #${userId} not found`);
    }

    // 2. Perform the delete
    // Because of your SQL Foreign Keys, you might need to ensure
    // related data is handled. 'delete' removes the row from the 'users' table.
    await this.userRepository.delete(userId);
  }
}