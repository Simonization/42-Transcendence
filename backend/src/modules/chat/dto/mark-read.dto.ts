import { IsInt } from 'class-validator';

export class DeleteMessageDto {
    @IsInt()
    messageId: number;
}