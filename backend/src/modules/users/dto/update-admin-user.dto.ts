import {
    IsString,
    IsOptional,
    IsNumber,
    IsIn,
    MaxLength,
    MinLength
} from 'class-validator';

export class UpdateAdminUserDto {
    @IsOptional()
    @IsString()
    @MaxLength(20)
    @MinLength(3, {
        message: 'Username length should be at least 3 characters and max 20 long',
    })
    username?: string;

    @IsOptional()
    @IsNumber()
    @IsIn([0, 1], {
        message: 'Status must be 0 (active) or 1 (banned)',
    })
    status?: number;

    @IsOptional()
    @IsString()
    avatarUrl?: string | null;
}
