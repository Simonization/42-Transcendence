import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource, In, Not } from 'typeorm';
import { Match, MatchStatus } from '../../matches/entities/match.entity';
import { Tournament, TournamentStatus } from '../entities/tournament.entity';
import { TournamentPhase } from '../entities/tournament-phase.entity';
import { BracketGeneratorService } from './bracket-generator.service';
import { Team } from '../../teams/entities/team.entity';

@Injectable()
export class PhaseService {
    constructor(
        private readonly dataSource: DataSource,
        private readonly bracketGenerator: BracketGeneratorService,
    ) {}

    async checkAndAdvance(phaseId: number): Promise<void> {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            const pendingMatches = await queryRunner.manager.count(Match, {
                where: { 
                    phase_id: phaseId, 
                    status: Not(In([MatchStatus.FINISHED, MatchStatus.CANCELLED, MatchStatus.BYE]))
                }
            });
            if (pendingMatches > 0) {
                await queryRunner.rollbackTransaction();
                return;
            }

            const currentPhase = await queryRunner.manager.findOne(TournamentPhase, {
                where: { id: phaseId },
                relations: ['tournament', 'tournament.phases']
            });

            if (!currentPhase) throw new NotFoundException('Phase not found');
            const tournament = currentPhase.tournament;

            const nextOrder = currentPhase.order + 1;
            const nextPhase = tournament.phases.find(p => p.order === nextOrder);

            if (!nextPhase) {
                await queryRunner.manager.update(Tournament, tournament.id, { status: TournamentStatus.COMPLETED });
            } else {
                await this.advanceToNextPhase(queryRunner, currentPhase, nextPhase);
                
                await queryRunner.manager.update(Tournament, tournament.id, {
                    current_phase_order: nextOrder,
                    active_phase_id: nextPhase.id
                });
            }

            await queryRunner.commitTransaction();
        } catch (err) {
            await queryRunner.rollbackTransaction();
            throw err;
        } finally {
            await queryRunner.release();
        }
    }

    private async advanceToNextPhase(queryRunner: any, current: TournamentPhase, next: TournamentPhase) {
        // 1. Get winners based on current phase type
        const qualifiedTeamIds = await this.calculateStandings(queryRunner, current);

        // 2. Fetch Team entities
        const qualifiedTeams = await queryRunner.manager.find(Team, {
            where: { id: In(qualifiedTeamIds) }
        });

        // 3. Trigger Generator (Updated to pass the 'next' entity)
        await this.bracketGenerator.generate(queryRunner, next, qualifiedTeams);
    }

    private async calculateStandings(queryRunner: any, phase: TournamentPhase): Promise<number[]> {
        const matches = await queryRunner.manager.find(Match, {
            where: { phase_id: phase.id, status: MatchStatus.FINISHED }
        });

        if (phase.type === 'GROUP_STAGE') {
            return this.calculateGroupStageStandings(matches, phase.group_winners_count);
        }

        // Default: Global win tally (Round Robin / Swiss)
        const winMap = new Map<number, number>();
        matches.forEach(match => {
            if (match.winner_id) {
                winMap.set(match.winner_id, (winMap.get(match.winner_id) || 0) + 1);
            }
        });

        return Array.from(winMap.entries())
            .sort((a, b) => b[1] - a[1])
            .map(entry => entry[0])
            .slice(0, phase.teams_limit_end);
    }

    private calculateGroupStageStandings(matches: Match[], winnersPerGroup: number): number[] {
        const groupsMap = new Map<string, Map<number, number>>();

        // Tally wins partitioned by group
        matches.forEach(match => {
            const groupName = match.game_data?.group || 'A';
            if (!groupsMap.has(groupName)) groupsMap.set(groupName, new Map());
            
            const standings = groupsMap.get(groupName)!;
            if (match.winner_id) {
                standings.set(match.winner_id, (standings.get(match.winner_id) || 0) + 1);
            }
        });

        const allQualifiers: number[] = [];
        groupsMap.forEach((standings) => {
            const topFromGroup = Array.from(standings.entries())
                .sort((a, b) => b[1] - a[1])
                .slice(0, winnersPerGroup)
                .map(entry => entry[0]);
            allQualifiers.push(...topFromGroup);
        });

        return allQualifiers;
    }
}