import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Team } from '../entities/team.entity';
import { InvitationStatus, TeamInvitation } from '../entities/team-invitation.entity';

export interface MyTournamentStatus {
    team: Team | null;
    invitation: TeamInvitation | null;
}

@Injectable()
export class GetMyTeamForTournamentQuery {
    constructor(
        @InjectRepository(Team) private teamRepo: Repository<Team>,
        @InjectRepository(TeamInvitation) private inviteRepo: Repository<TeamInvitation>,
    ) {}

    async execute(tournamentId: number, userId: number): Promise<MyTournamentStatus> {
        // Check if user is in a team for this tournament (captain is always in members)
        const team = await this.teamRepo
            .createQueryBuilder('team')
            .innerJoin('team.tournament', 'tournament', 'tournament.id = :tournamentId', { tournamentId })
            .innerJoin('team.members', 'memberFilter', 'memberFilter.id = :userId', { userId })
            .leftJoinAndSelect('team.members', 'member')
            .leftJoinAndSelect('team.captain', 'captain')
            .getOne();

        // Always check for a pending invitation (even if already in a team — user may want to switch)
        const invitation = await this.inviteRepo
            .createQueryBuilder('inv')
            .innerJoin('inv.team', 'invTeamFilter')
            .innerJoin('invTeamFilter.tournament', 'tournament', 'tournament.id = :tournamentId', { tournamentId })
            .leftJoinAndSelect('inv.team', 'invTeam')
            .leftJoinAndSelect('invTeam.members', 'member')
            .leftJoinAndSelect('invTeam.captain', 'captain')
            .leftJoinAndSelect('inv.sender', 'sender')
            .where('inv.receiver_id = :userId', { userId })
            .andWhere('inv.status = :status', { status: InvitationStatus.PENDING })
            // Exclude invitation to the team the user is already in
            .andWhere(team ? 'inv.team_id != :currentTeamId' : '1=1', { currentTeamId: team?.id })
            .getOne();

        return { team, invitation };
    }

    async getPendingInvitations(teamId: number): Promise<TeamInvitation[]> {
        return this.inviteRepo.find({
            where: { team_id: teamId, status: InvitationStatus.PENDING },
            relations: ['receiver'],
        });
    }
}
