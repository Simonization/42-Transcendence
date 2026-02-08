import {
    IsString,
    IsOptional,
    MaxLength,
    MinLength
} from 'class-validator';

export class UpdateProfileDto {
    @IsOptional()
    @IsString()
    @MaxLength(20)
    @MinLength(3, {
        message: 'Displayed name length should be at least 3 characters and max 20 long',
    })
    displayName?: string;

    @IsOptional()
    @IsString()
    avatarUrl?: string;

    @IsOptional()
    @IsString()
    bio ?: string;
}
