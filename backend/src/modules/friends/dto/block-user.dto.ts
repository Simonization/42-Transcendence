import {
    IsInt,
    IsPositive,
    IsString,
    IsOptional,
    MaxLength
} from 'class-validator';

export class BlockUserDto {
    @IsInt()
    @IsPositive()
    targetId: number;

    @IsOptional()
    @IsString()
    @MaxLength(100)
    reason?: string;
}