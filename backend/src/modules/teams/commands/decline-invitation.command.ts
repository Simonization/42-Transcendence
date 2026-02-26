import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InvitationStatus, TeamInvitation } from '../entities/team-invitation.entity';

@Injectable()
export class DeclineInvitationCommand {
  constructor(
    @InjectRepository(TeamInvitation) private inviteRepo: Repository<TeamInvitation>
  ) {}

  async execute(invitationId: number, userId: number) {
    const invite = await this.inviteRepo.findOneBy({ 
      id: invitationId, 
      receiver_id: userId,
      status: InvitationStatus.PENDING 
    });

    if (!invite) throw new NotFoundException('Invitation not found');

    invite.status = InvitationStatus.DECLINED;
    return await this.inviteRepo.save(invite);
  }
}