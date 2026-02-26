import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Team } from './entities/team.entity';
import { TeamInvitation } from './entities/team-invitation.entity';
import { User } from '../users/entities/user.entity';
import { Tournament } from '../tournaments/entities/tournament.entity';
import { TeamsController } from './teams.controller';
import { TeamsService } from './teams.service';

import { CreateTeamCommand } from './commands/create-team.command';
import { InvitePlayerCommand } from './commands/invite-player.command';
import { KickPlayerCommand } from './commands/kick-player.command';
import { LockTeamCommand } from './commands/lock-team.command';
import { AcceptInvitationCommand } from './commands/accept-invitation.command';
import { DeclineInvitationCommand } from './commands/decline-invitation.command';
import { GetMyInvitationsQuery } from './queries/get-my-invitations.query';

@Module({
  imports: [
    TypeOrmModule.forFeature([Team, TeamInvitation, User, Tournament]),
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
    GetMyInvitationsQuery,
  ],
  exports: [TeamsService],
})
export class TeamsModule {}