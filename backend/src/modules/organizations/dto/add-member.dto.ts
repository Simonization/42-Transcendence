import { IsInt, IsOptional, IsString, IsIn } from 'class-validator';

export class AddMemberDto {
    @IsInt()
    userId: number;

    @IsOptional()
    @IsString()
    @IsIn(['admin', 'member'])
    role?: string;
}
