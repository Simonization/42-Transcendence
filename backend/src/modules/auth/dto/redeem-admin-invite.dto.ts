import { IsNotEmpty, IsString } from 'class-validator';

export class RedeemAdminInviteDto {
    @IsString()
    @IsNotEmpty()
    token: string;
}
