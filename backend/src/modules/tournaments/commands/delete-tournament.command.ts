import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, Repository } from "typeorm";
import { Tournament } from "../entities/tournament.entity";
import { Team } from "../../teams/entities/team.entity";
import { TeamInvitation } from "../../teams/entities/team-invitation.entity";

@Injectable()
export class DeleteTournamentCommand {
    constructor(
        @InjectRepository(Tournament) private repo: Repository<Tournament>,
        private dataSource: DataSource,
    ) {}

    async execute(id: number) {
        const tournament = await this.repo.findOne({ where: { id } });
        if (!tournament) throw new NotFoundException();

        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            // Find all teams for this tournament
            const teams = await queryRunner.manager.find(Team, {
                where: { tournament: { id } },
                relations: ['members'],
            });

            for (const team of teams) {
                // Delete all invitations referencing this team (FK constraint)
                await queryRunner.manager.delete(TeamInvitation, { team_id: team.id });
                // Clear members junction table
                team.members = [];
                await queryRunner.manager.save(team);
                // Delete the team
                await queryRunner.manager.delete(Team, { id: team.id });
            }

            // Delete the tournament
            await queryRunner.manager.delete(Tournament, { id });

            await queryRunner.commitTransaction();

        } catch (err) {
            await queryRunner.rollbackTransaction();
            throw err;
        } finally {
            await queryRunner.release();
        }
    }
}
