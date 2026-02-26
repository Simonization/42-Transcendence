import { Match } from '../../../matches/entities/match.entity';
import { Team } from '../../../teams/entities/team.entity';

export class GroupStageGenerator {
    constructor(private readonly queryRunner: any) {}

    async build(teams: Team[], phaseId: number, groupSize: number): Promise<void> {
        const numGroups = Math.ceil(teams.length / groupSize);

        for (let i = 0; i < numGroups; i++) {
            const groupTeams = teams.slice(i * groupSize, (i + 1) * groupSize);
            const groupLabel = String.fromCharCode(65 + i);

            await this.generateRoundRobinPairings(groupTeams, phaseId, groupLabel);
        }
    }

    private async generateRoundRobinPairings(teams: Team[], phaseId: number, label: string): Promise<void> {
        const n = teams.length;

        for (let i = 0; i < n; i++) {
            for (let j = i + 1; j < n; j++) {
                // 1. Create the Match entity
                const match = this.queryRunner.manager.create(Match, {
                    phase_id: phaseId,
                    status: "WAITING",
                    round_order: 1,
                    game_data: { group: label },
                    teams: [teams[i], teams[j]] 
                });

                await this.queryRunner.manager.save(Match, match);
            }
        }
    }
}