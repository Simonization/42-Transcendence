import { IsEnum } from 'class-validator';
import { InvitationStatus } from '../entities/team-invitation.entity';

export class HandleInvitationDto {
    @IsEnum(InvitationStatus)
    status: InvitationStatus;
}