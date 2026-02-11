import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Match, GameType } from '../entities/match.entity';
import { ChessMatch } from '../entities/chess-match.entity';
import { LeagueMatch } from '../entities/league-match.entity';
import { UpdateMatchDto } from '../dto/update-match.dto';

@Injectable()
export class UpdateMatchCommand {
    constructor(private dataSource: DataSource) {}

    async execute(id: number, dto: UpdateMatchDto): Promise<void> {
        const match = await this.dataSource.getRepository(Match).findOneBy({ id });
        if (!match) throw new NotFoundException('Match not found');

        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            // 1. Update Game Data if provided
            if (dto.game_data) {
                const repo = match.game_type === GameType.CHESS ? ChessMatch : LeagueMatch;
                const updatePayload = match.game_type === GameType.LEAGUE 
                    ? { data: dto.game_data } 
                    : dto.game_data;
                
                await queryRunner.manager.update(repo, match.game_match_id, updatePayload);
            }

            // 2. Update Base Match metadata
            if (dto.tournament_id !== undefined) {
                await queryRunner.manager.update(Match, id, { tournament_id: dto.tournament_id });
            }

            await queryRunner.commitTransaction();
        } catch (err) {
            await queryRunner.rollbackTransaction();
            throw err;
        } finally {
            await queryRunner.release();
        }
    }
}