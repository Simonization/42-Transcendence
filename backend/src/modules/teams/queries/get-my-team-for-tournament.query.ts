import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Team } from '../entities/team.entity';
import { InvitationDirection, InvitationStatus, TeamInvitation } from '../entities/team-invitation.entity';
import { Tournament } from '../../tournaments/entities/tournament.entity';
import { LookingForTeam } from '../entities/looking-for-team.entity';
import { GetTournamentAvailabilityQuery, TournamentAvailability } from './get-tournament-availability.query';

export interface MyTournamentStatus {
    team: Team | null;
    invitation: TeamInvitation | null;
    /** Pending join requests the user sent to teams of this tournament. */
    requests: TeamInvitation[];
    /** Roster spots left on my team (game team size minus members), null without a team. */
    teamSpotsLeft: number | null;
    /** Registration capacity of the tournament ("full" state for the UI). */
    availability: TournamentAvailability | null;
    /** The user's looking-for-team flag for this tournament, if any. */
    lookingForTeam: LookingForTeam | null;
}

@Injectable()
export class GetMyTeamForTournamentQuery {
    constructor(
        @InjectRepository(Team) private teamRepo: Repository<Team>,
        @InjectRepository(TeamInvitation) private inviteRepo: Repository<TeamInvitation>,
        @InjectRepository(Tournament) private tournamentRepo: Repository<Tournament>,
        @InjectRepository(LookingForTeam) private lftRepo: Repository<LookingForTeam>,
        private readonly availabilityQuery: GetTournamentAvailabilityQuery,
    ) {}

    async execute(tournamentId: number, userId: number): Promise<MyTournamentStatus> {
        // Check if user is in a team for this tournament (captain is always in members)
        const team = await this.teamRepo
            .createQueryBuilder('team')
            .innerJoin('team.tournament', 'tournament', 'tournament.id = :tournamentId', { tournamentId })
            .innerJoin('team.members', 'memberFilter', 'memberFilter.id = :userId', { userId })
            .leftJoinAndSelect('team.members', 'member')
            .leftJoinAndSelect('team.captain', 'captain')
            .leftJoinAndSelect('team.admins', 'admin')
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
            .andWhere('inv.direction = :direction', { direction: InvitationDirection.INVITE })
            // Exclude invitation to the team the user is already in
            .andWhere(team ? 'inv.team_id != :currentTeamId' : '1=1', { currentTeamId: team?.id })
            .getOne();

        const requests = await this.inviteRepo
            .createQueryBuilder('req')
            .innerJoin('req.team', 'reqTeamFilter')
            .innerJoin('reqTeamFilter.tournament', 'tournament', 'tournament.id = :tournamentId', { tournamentId })
            .leftJoinAndSelect('req.team', 'reqTeam')
            .where('req.sender_id = :userId', { userId })
            .andWhere('req.status = :status', { status: InvitationStatus.PENDING })
            .andWhere('req.direction = :direction', { direction: InvitationDirection.REQUEST })
            .getMany();

        const tournament = await this.tournamentRepo.findOne({
            where: { id: tournamentId },
            relations: ['phases', 'phases.game'],
        });
        const availability = tournament ? await this.availabilityQuery.compute(tournament) : null;

        let teamSpotsLeft: number | null = null;
        if (team && tournament) {
            const phase1 = tournament.phases?.find((p) => p.order === 1);
            const size = phase1?.game?.teamSize ?? 1;
            teamSpotsLeft = Math.max(0, size - (team.members?.length ?? 0));
        }

        const lookingForTeam = await this.lftRepo.findOneBy({ userId, tournamentId });

        return { team, invitation, requests, teamSpotsLeft, availability, lookingForTeam };
    }

    /** Restricted to team members: the roster reveals who has been invited. */
    async getPendingInvitations(teamId: number, requesterId: number): Promise<TeamInvitation[]> {
        const isMember = await this.teamRepo.existsBy({
            id: teamId,
            members: { id: requesterId },
        });
        if (!isMember) {
            throw new ForbiddenException('Only team members can view pending invitations');
        }

        return this.inviteRepo.find({
            where: {
                team_id: teamId,
                status: InvitationStatus.PENDING,
                direction: InvitationDirection.INVITE,
            },
            relations: ['receiver'],
        });
    }
}
