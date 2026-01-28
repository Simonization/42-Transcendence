import { IsInt, IsString, IsNotEmpty, IsBoolean, IsOptional } from 'class-validator';

export class SendMessageDto {
    @IsInt()
    chatId: number;

    @IsString()
    @IsNotEmpty()
    content: string;

    @IsOptional()
    @IsBoolean()
    isGif?: boolean;
}