import {
    IsString,
    IsOptional,
    IsNumber,
    IsIn,
    IsBoolean,
} from 'class-validator';

export class UpdateSettingsDto {
    @IsOptional()
    @IsString()
    @IsIn(['en', 'fr', 'tr', 'nl', 'ko'], {
        message: 'Language must be one of: en, fr, tr, nl, ko',
    })
    language?: string;

    @IsOptional()
    @IsString()
    timezone?: string;

    @IsOptional()
    @IsNumber()
    @IsIn([0, 1, 2], {
        message: 'Theme must be 0 (System), 1 (Light), or 2 (Dark)',
    })
    theme?: number;

    @IsOptional()
    @IsBoolean()
    openMessage?: boolean;
}