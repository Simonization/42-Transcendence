import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Block } from '../entities/block.entity';
import { UnblockUserDto } from '../dto/unblock-user.dto';

@Injectable()
export class UnblockUserCommand {
    constructor(
        @InjectRepository(Block) private readonly blockRepo: Repository<Block>,
    ) {}

    async execute(userId: number, dto: UnblockUserDto): Promise<void> {
        const block = await this.blockRepo.findOne({
            where: {
                blocker: { id: userId } as any,
                blocked: { id: dto.targetId } as any,
            },
        });

        if (!block) {
            throw new NotFoundException('Block record not found');
        }

        await this.blockRepo.remove(block);
    }
}