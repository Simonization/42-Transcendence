import { IsInt, IsPositive } from 'class-validator';

export class InviteMemberDto {
    @IsInt()
    @IsPositive()
    userId: number;
}

export class KickMemberDto {
    @IsInt()
    @IsPositive()
    userId: number;
}