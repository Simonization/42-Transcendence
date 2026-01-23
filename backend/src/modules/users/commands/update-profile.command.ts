import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserProfile } from '../entities/user-profile.entity';
import { UpdateProfileDto } from '../dto/update-profile.dto';

@Injectable()
export class UpdateProfileCommand {
  constructor(
    @InjectRepository(UserProfile)
    private readonly profileRepo: Repository<UserProfile>,
  ) {}

  async execute(userId: number, dto: UpdateProfileDto): Promise<void> {
    const result = await this.profileRepo.update({ userId }, dto);

    // No rows affected, user_id likely doesn't exist
    if (result.affected === 0) {
      throw new NotFoundException(`Settings for User #${userId} not found`);
    }
  }
}