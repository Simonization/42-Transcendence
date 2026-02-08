import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserSettings } from '../entities/user-settings.entity';
import { UpdateSettingsDto } from '../dto/update-settings.dto';

@Injectable()
export class UpdateSettingsCommand {
  constructor(
    @InjectRepository(UserSettings)
    private readonly settingsRepo: Repository<UserSettings>,
  ) {}

  async execute(userId: number, dto: UpdateSettingsDto): Promise<void> {
    const result = await this.settingsRepo.update({ userId }, dto);

    // No rows affected, user_id likely doesn't exist
    if (result.affected === 0) {
      throw new NotFoundException(`Settings for User #${userId} not found`);
    }
  }
}