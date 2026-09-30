import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InvitationDirection, InvitationStatus, TeamInvitation } from '../entities/team-invitation.entity';
import { RealtimeService } from '../../realtime/realtime.service';
import { RealtimeEvents } from '../../realtime/realtime.events';

@Injectable()
export class DeclineInvitationCommand {
  constructor(
    @InjectRepository(TeamInvitation) private inviteRepo: Repository<TeamInvitation>,
    private readonly realtime: RealtimeService,
  ) {}

  async execute(invitationId: number, userId: number) {
    const invite = await this.inviteRepo.findOneBy({ 
      id: invitationId, 
      receiver_id: userId,
      status: InvitationStatus.PENDING,
      direction: InvitationDirection.INVITE,
    });

    if (!invite) throw new NotFoundException('Invitation not found');

    invite.status = InvitationStatus.DECLINED;
    const saved = await this.inviteRepo.save(invite);

    this.realtime.toUser(invite.sender_id, RealtimeEvents.INVITATION_RECEIVED, { id: invite.id, reason: 'invitation_declined' });
    this.realtime.toTeam(invite.team_id, RealtimeEvents.TEAM_UPDATED, { id: invite.team_id, reason: 'invitation_declined' });
    return saved;
  }
}