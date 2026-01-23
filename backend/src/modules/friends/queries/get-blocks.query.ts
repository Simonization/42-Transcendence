import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Block } from '../entities/block.entity';

@Injectable()
export class GetBlocksQuery {
  constructor(
    @InjectRepository(Block)
    private readonly blockRepo: Repository<Block>,
  ) {}

  async execute(userId: number) {
    return await this.blockRepo.find({
      where: { blocker: { id: userId } as any },
      relations: ['blocked'],
    });
  }
}