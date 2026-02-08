import { IsInt, IsPositive } from 'class-validator';

export class DeleteMessageDto {
    @IsInt()
    @IsPositive()
    messageId: number;
}