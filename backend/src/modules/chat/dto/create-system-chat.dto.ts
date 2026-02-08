import { 
        IsArray, 
        IsInt, 
        IsOptional, 
        IsString, 
        ArrayMinSize, 
        MaxLength 
} from 'class-validator';

export class CreateSystemChatDto {
    @IsArray()
    @IsInt({ each: true })
    @ArrayMinSize(1)
    targetUserIds: number[];

    @IsOptional()
    @IsString()
    @MaxLength(100)
    title?: string;
}