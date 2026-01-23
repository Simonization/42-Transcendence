import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Block } from '../entities/block.entity';
import { BlockUserDto } from '../dto/block-user.dto';

@Injectable()
export class BlockUserCommand {
    constructor(
        @InjectRepository(Block) private readonly blockRepo: Repository<Block>
    ) {}

    async execute(userId: number, dto: BlockUserDto) {
        const block = this.blockRepo.create({
            blocker: { id: userId },
            blocked: { id: dto.targetId },
            reason: dto.reason
        });
        return await this.blockRepo.save(block);
    }
}