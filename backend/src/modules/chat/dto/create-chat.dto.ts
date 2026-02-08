import { 
    IsArray, 
    IsInt, 
    IsOptional, 
    IsString, 
    ArrayMinSize, 
    MaxLength 
} from 'class-validator';

export class CreateChatDto {
    @IsArray()
    @IsInt({ each: true })
    @ArrayMinSize(1)
    // One ID for DM, multiple for Group
    userIds: number[];

    @IsOptional()
    @IsString()
    @MaxLength(50)
    // Optional title (useful for Group chats)
    title?: string;
}