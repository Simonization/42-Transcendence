import { Type } from 'class-transformer';
import { IsEnum, IsOptional, IsInt, IsString, IsObject, IsArray, ValidateNested } from 'class-validator';
import { MatchParticipantDto } from './create-match.dto';
import { MatchStatus } from '../entities/match.entity';

export class UpdateMatchDto {
    @IsOptional()
    @IsEnum(MatchStatus)
    status?: MatchStatus;

    @IsOptional()
    @IsInt()
    winner_id?: number;

    @IsOptional()
    @IsString()
    score?: string;

    @IsOptional()
    @IsObject()
    game_data?: Record<string, any>;

    // Add this if you want to update individual player outcomes (Win/Loss/Draw)
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => MatchParticipantDto) 
    participants?: MatchParticipantDto[]; 
}