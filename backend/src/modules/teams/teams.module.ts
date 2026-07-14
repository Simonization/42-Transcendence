import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Team } from './entities/team.entity';
import { TeamInvitation } from './entities/team-invitation.entity';
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

@Module({
  imports: [
    TypeOrmModule.forFeature([Team, TeamInvitation, User, Tournament]),
    NotificationsModule,
  ],
  controllers: [TeamsController],
  providers: [
    TeamsService,
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
  ],
  exports: [TeamsService],
})
export class TeamsModule {}
