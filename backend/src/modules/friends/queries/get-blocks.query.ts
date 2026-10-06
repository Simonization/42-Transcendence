import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Block } from '../entities/block.entity';
import { toPublicUserOrNil } from '../../users/public-user';

@Injectable()
export class GetBlocksQuery {
    constructor(
        @InjectRepository(Block)
        private readonly blockRepo: Repository<Block>,
    ) {}

    async execute(userId: number) {
        const blocks = await this.blockRepo.find({
            where: { blocker: { id: userId } as any },
            relations: ['blocked'],
        });
        // Anyone can block any user id, so the blocked user must come back as a public user:
        // otherwise blocking someone was a way to read their email address.
        return blocks.map((b) => ({ ...b, blocked: toPublicUserOrNil(b.blocked) }));
    }
}
