import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { DataSource, In } from "typeorm";
import { CreateMatchDto, UserMatchResult } from "../dto/create-match.dto";
import { Match, MatchStatus } from "../entities/match.entity";
import { UserMatch } from "../entities/user-match.entity";
import { Team } from "../../teams/entities/team.entity";

@Injectable()
export class CreateMatchCommand {
    constructor(private dataSource: DataSource) {}

    /** Admin-only manual match. teamIds[0] goes to slot 1, teamIds[1] to slot 2. */
    async execute(dto: CreateMatchDto): Promise<Match> {
        const teamIds = dto.teamIds ?? [];
        if (teamIds.length > 2) throw new BadRequestException('A match has at most two teams.');
        if (teamIds.length === 2 && teamIds[0] === teamIds[1]) {
            throw new BadRequestException('A team cannot play itself.');
        }

        const id = await this.dataSource.transaction(async (manager) => {
            if (teamIds.length) {
                const found = await manager.count(Team, { where: { id: In(teamIds) } });
                if (found !== teamIds.length) throw new NotFoundException('Unknown team id.');
            }

            const match = manager.create(Match, {
                game_id: dto.game_id,
                tournament_id: dto.tournament_id,
                phase_id: dto.phase_id,
                game_data: dto.game_data || {},
                team1_id: teamIds[0] ?? null,
                team2_id: teamIds[1] ?? null,
                status: teamIds.length === 2 ? MatchStatus.READY : MatchStatus.WAITING,
                winner_next_match_id: dto.winner_next_match_id,
                winner_next_match_slot: dto.winner_next_match_slot
            });

            const savedMatch = await manager.save(match);

            if (dto.participants && dto.participants.length > 0) {
                const participants = dto.participants.map((p) =>
                    manager.create(UserMatch, {
                        match_id: savedMatch.id,
                        user_id: p.userId,
                        team_id: p.teamId,
                        result: (p.result as UserMatchResult) || UserMatchResult.PENDING,
                    })
                );
                await manager.save(UserMatch, participants);
            }
            return savedMatch.id;
        });

        const created = await this.dataSource.getRepository(Match).findOne({
            where: { id },
            relations: ['userMatches', 'userMatches.user', 'phase', 'team1', 'team2']
        });
        if (!created) throw new NotFoundException(`Match ${id} not found`);
        return created;
    }
}
