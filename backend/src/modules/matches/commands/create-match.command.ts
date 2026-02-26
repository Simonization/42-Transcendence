import { Injectable, NotFoundException } from "@nestjs/common";
import { DataSource, In } from "typeorm";
import { CreateMatchDto, UserMatchResult } from "../dto/create-match.dto";
import { Match, MatchStatus } from "../entities/match.entity";
import { UserMatch } from "../entities/user-match.entity";
import { Team } from "src/modules/teams/entities/team.entity";

@Injectable()
export class CreateMatchCommand {
    constructor(private dataSource: DataSource) {}

    async execute(dto: CreateMatchDto): Promise<Match> {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            let teams: Team[] = [];
            if (dto.teamIds && dto.teamIds.length > 0) {
                teams = await queryRunner.manager.find(Team, {
                    where: { id: In(dto.teamIds) }
                });
            }

            const match = queryRunner.manager.create(Match, {
                game_id: dto.game_id,
                tournament_id: dto.tournament_id,
                phase_id: dto.phase_id,
                game_data: dto.game_data || {},
                status: MatchStatus.WAITING,
                teams: teams,
                winner_next_match_id: dto.winner_next_match_id,
                winner_next_match_slot: dto.winner_next_match_slot
            });

            const savedMatch = await queryRunner.manager.save(match);

            if (dto.participants && dto.participants.length > 0) {
                const participants = dto.participants.map((p) =>
                    queryRunner.manager.create(UserMatch, {
                        match_id: savedMatch.id,
                        user_id: p.userId,
                        team_id: p.teamId,
                        result: (p.result as UserMatchResult) || UserMatchResult.PENDING,
                    })
                );
                await queryRunner.manager.save(UserMatch, participants);
            }

            await queryRunner.commitTransaction();

            const match_return = await queryRunner.manager.findOne(Match, {
                where: { id: savedMatch.id },
                relations: ['userMatches', 'userMatches.user', 'phase', 'teams']
            });

            if (!match_return) throw new NotFoundException(`Match ${savedMatch.id} not found`);

            return match_return;

        } catch (err) {
            await queryRunner.rollbackTransaction();
            throw err;
        } finally {
            await queryRunner.release();
        }
    }
}