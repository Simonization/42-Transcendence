import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Team } from './entities/team.entity';
import { TeamAdmin } from './entities/team-admin.entity';
import { TeamInvitation } from './entities/team-invitation.entity';
import { LookingForTeam } from './entities/looking-for-team.entity';
import { User } from '../users/entities/user.entity';
import { Tournament } from '../tournaments/entities/tournament.entity';
import { TeamsController } from './teams.controller';
import { TeamsService } from './teams.service';
import { NotificationsModule } from '../notifications/notifications.module';

import { CreateTeamCommand } from './commands/create-team.command';
import { InvitePlayerCommand } from './commands/invite-player.command';
import { KickPlayerCommand } from './commands/kick-player.command';
import { LockTeamCommand } from './commands/lock-team.command';
import { AcceptInvitationCommand } from './commands/accept-invitation.command';
import { DeclineInvitationCommand } from './commands/decline-invitation.command';
import { DeleteTeamCommand } from './commands/delete-team.command';
import { LeaveTeamCommand } from './commands/leave-team.command';
import { GetMyInvitationsQuery } from './queries/get-my-invitations.query';
import { GetMyTeamForTournamentQuery } from './queries/get-my-team-for-tournament.query';
import { SetAdminCommand } from './commands/set-admin.command';
import { TeamPermissionsService } from './services/team-permissions.service';
import { TeamMembershipService } from './services/team-membership.service';
import { RenameTeamCommand } from './commands/rename-team.command';
import { UnlockTeamCommand } from './commands/unlock-team.command';
import { TransferCaptaincyCommand } from './commands/transfer-captaincy.command';
import { CancelInvitationCommand } from './commands/cancel-invitation.command';
import { JoinCodeCommand } from './commands/join-code.command';
import { JoinByCodeCommand } from './commands/join-by-code.command';
import { CreateJoinRequestCommand } from './commands/create-join-request.command';
import { AcceptJoinRequestCommand } from './commands/accept-join-request.command';
import { DeclineJoinRequestCommand } from './commands/decline-join-request.command';
import { LookingForTeamCommand } from './commands/looking-for-team.command';
import { GetJoinRequestsQuery } from './queries/get-join-requests.query';
import { GetLookingForTeamQuery } from './queries/get-looking-for-team.query';
import { GetTournamentAvailabilityQuery } from './queries/get-tournament-availability.query';

@Module({
  imports: [
    TypeOrmModule.forFeature([Team, TeamAdmin, TeamInvitation, LookingForTeam, User, Tournament]),
    NotificationsModule,
  ],
  controllers: [TeamsController],
  providers: [
    TeamsService,
    TeamPermissionsService,
    SetAdminCommand,
    CreateTeamCommand,
    InvitePlayerCommand,
    KickPlayerCommand,
    LockTeamCommand,
    AcceptInvitationCommand,
    DeclineInvitationCommand,
    DeleteTeamCommand,
    LeaveTeamCommand,
    GetMyInvitationsQuery,
    GetMyTeamForTournamentQuery,
    TeamMembershipService,
    RenameTeamCommand,
    UnlockTeamCommand,
    TransferCaptaincyCommand,
    CancelInvitationCommand,
    JoinCodeCommand,
    JoinByCodeCommand,
    CreateJoinRequestCommand,
    AcceptJoinRequestCommand,
    DeclineJoinRequestCommand,
    LookingForTeamCommand,
    GetJoinRequestsQuery,
    GetLookingForTeamQuery,
    GetTournamentAvailabilityQuery,
  ],
  exports: [TeamsService, TeamPermissionsService],
})
export class TeamsModule {}
