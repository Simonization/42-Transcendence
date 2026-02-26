import { Match } from '../../../matches/entities/match.entity';
import { Team } from '../../../teams/entities/team.entity';

export class SingleEliminationGenerator {
    constructor(private readonly queryRunner: any) {}

    async build(teams: Team[], phaseId: number): Promise<void> {
        const numTeams = teams.length;
        const totalSlots = Math.pow(2, Math.ceil(Math.log2(numTeams)));
        const totalRounds = Math.log2(totalSlots);
        
        const teamPool = [...teams];

        await this.generateMatchBranch(
            phaseId,
            totalRounds,
            null,
            null, 
            teamPool
        );
    }

    private async generateMatchBranch(
        phaseId: number,
        round: number,
        nextMatchId: number | null,
        nextMatchSlot: number | null,
        teams: Team[]
    ): Promise<number> {
        const match = this.queryRunner.manager.create(Match, {
            phase_id: phaseId,
            round_order: round,
            winner_next_match_id: nextMatchId,
            winner_next_match_slot: nextMatchSlot,
            status: "WAITING",
            game_data: {},
            // Initialize with an empty array for teams
            teams: []
        });

        // BASE CASE: Round 1 (Leaf matches)
        if (round === 1) {
            const teamA = teams.pop();
            const teamB = teams.pop();
            
            // Push teams into the array relationship instead of team_a_id
            if (teamA) match.teams.push(teamA);
            if (teamB) match.teams.push(teamB);
            
            const savedLeaf = await this.queryRunner.manager.save(Match, match);
            return savedLeaf.id;
        }

        // RECURSIVE STEP
        const savedParent = await this.queryRunner.manager.save(Match, match);

        await this.generateMatchBranch(phaseId, round - 1, savedParent.id, 1, teams);
        await this.generateMatchBranch(phaseId, round - 1, savedParent.id, 2, teams);

        return savedParent.id;
    }
}