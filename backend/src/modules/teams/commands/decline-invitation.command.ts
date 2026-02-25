import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TeamInvitation } from '../entities/team-invitation.entity';

@Injectable()
export class DeclineInvitationCommand {
  constructor(
    @InjectRepository(TeamInvitation) private inviteRepo: Repository<TeamInvitation>
  ) {}

  async execute(invitationId: number, userId: number) {
    const invite = await this.inviteRepo.findOneBy({ 
      id: invitationId, 
      receiver_id: userId,
      status: 'PENDING' 
    });

    if (!invite) throw new NotFoundException('Invitation not found');

    invite.status = 'DECLINED';
    return await this.inviteRepo.save(invite);
  }
}