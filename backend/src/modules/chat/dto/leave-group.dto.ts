import { IsInt, IsPositive } from 'class-validator';

export class LeaveGroupDto {
    @IsInt()
    @IsPositive()
    chatId: number;
}