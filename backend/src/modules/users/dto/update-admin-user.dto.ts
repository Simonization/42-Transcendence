import {
    IsString,
    IsOptional,
    IsNumber,
    IsIn,
    IsInt,
    Min,
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
    @IsString()
    @MaxLength(30)
    @MinLength(2, {
        message: 'Display name length should be at least 2 characters and max 30 long',
    })
    displayName?: string;

    @IsOptional()
    @IsNumber()
    @IsIn([0, 1], {
        message: 'Status must be 0 (active) or 1 (banned)',
    })
    status?: number;

    @IsOptional()
    @IsString()
    @IsIn(['hours', 'days', 'permanent'], {
        message: 'banUnit must be hours, days, or permanent',
    })
    banUnit?: 'hours' | 'days' | 'permanent';

    @IsOptional()
    @IsInt()
    @Min(1)
    banValue?: number;

    @IsOptional()
    @IsString()
    avatarUrl?: string | null;
}
