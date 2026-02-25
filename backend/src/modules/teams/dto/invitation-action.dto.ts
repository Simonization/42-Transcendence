import { IsEnum } from 'class-validator';

// If you want to use one endpoint for both actions
export enum InvitationStatus {
    ACCEPTED = 'ACCEPTED',
    DECLINED = 'DECLINED'
}

export class HandleInvitationDto {
    @IsEnum(InvitationStatus)
    status: InvitationStatus;
}