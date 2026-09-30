import { IsOptional, IsString, MaxLength } from 'class-validator';

export class LookingForTeamDto {
    @IsOptional()
    @IsString()
    @MaxLength(140)
    note?: string;
}
