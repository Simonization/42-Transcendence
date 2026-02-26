import { BadRequestException, forwardRef, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { DataSource } from "typeorm";
import { Match, MatchStatus } from "../entities/match.entity";
import { UpdateMatchDto } from "../dto/update-match.dto";
import { PhaseService } from "../../tournaments/services/phase.service";
import { Team } from "../../teams/entities/team.entity";
import { UserMatch } from "../entities/user-match.entity";

@Injectable()
export class UpdateMatchCommand {
    constructor(
        private dataSource: DataSource,
        @Inject(forwardRef(() => PhaseService))
        private phaseService: PhaseService
    ) {}

    async execute(matchId: number, dto: UpdateMatchDto): Promise<Match> {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            const match = await queryRunner.manager.findOne(Match, {
                where: { id: matchId },
                relations: ['teams', 'phase']
            });

            if (!match) throw new NotFoundException(`Match ${matchId} not found`);

            if (dto.status === MatchStatus.FINISHED && !dto.winner_id && !match.winner_id) {
                throw new BadRequestException('winner_id is required to finish a match');
            }
            if (dto.status) match.status = dto.status;
            if (dto.winner_id) match.winner_id = dto.winner_id;
            if (dto.score) match.score = dto.score;
            if (dto.game_data) match.game_data = { ...match.game_data, ...dto.game_data };
            if (dto.participants && dto.participants.length > 0) {
                for (const p of dto.participants) {
                    await queryRunner.manager.update(
                        UserMatch,
                        { match_id: matchId, user_id: p.userId },
                        { result: p.result }
                    );
                }
            }

            await queryRunner.manager.save(match);

            if (match.status === MatchStatus.FINISHED && match.winner_id) {
                await this.propagateWinner(queryRunner, match);
            }

            await queryRunner.commitTransaction();

            if (match.status === MatchStatus.FINISHED) {
                await this.phaseService.checkAndAdvance(match.phase_id);
            }

            const result = await this.dataSource.getRepository(Match).findOne({
                where: { id: matchId },
                relations: ['teams', 'userMatches', 'userMatches.user', 'phase']
            });

            if (!result) throw new NotFoundException(`Match ${matchId} not found after update`);
            return result;

        } catch (err) {
            await queryRunner.rollbackTransaction();
            throw err;
        } finally {
            await queryRunner.release();
        }
    }

    private async propagateWinner(queryRunner: any, match: Match) {
        if (!match.winner_next_match_id) return;

        const nextMatch = await queryRunner.manager.findOne(Match, {
            where: { id: match.winner_next_match_id },
            relations: ['teams']
        });

        if (!nextMatch) return;

        const winnerTeam = await queryRunner.manager.findOne(Team, {
            where: { id: match.winner_id }
        });

        if (!winnerTeam) return;

        const targetIndex = (match.winner_next_match_slot || 1) - 1;

        if (!nextMatch.teams) nextMatch.teams = [];
        while (nextMatch.teams.length <= targetIndex) {
            nextMatch.teams.push(null as any);
        }
        nextMatch.teams[targetIndex] = winnerTeam;

        nextMatch.teams = nextMatch.teams.filter(Boolean);

        await queryRunner.manager.save(Match, nextMatch);
    }
}