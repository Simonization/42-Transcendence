import { 
    IsInt, 
    IsOptional, 
    IsArray, 
    IsObject, 
    IsEnum, 
    ValidateNested, 
    IsNumber
} from 'class-validator';
import { Type } from 'class-transformer';

export enum UserMatchResult {
    PENDING = 'PENDING',
    WIN = 'WIN',
    LOSS = 'LOSS',
    DRAW = 'DRAW'
}

export class MatchParticipantDto {
    @IsNumber()
    userId: number;

    @IsOptional()
    @IsNumber()
    teamId?: number;

    @IsOptional()
    @IsEnum(UserMatchResult)
    result?: UserMatchResult;
}

export class CreateMatchDto {
    @IsInt()
    game_id: number;

    @IsInt()
    tournament_id: number;

    @IsInt()
    phase_id: number;

    @IsOptional()
    @IsObject()
    game_data?: Record<string, any>;

    @IsArray()
    @IsInt({ each: true })
    teamIds: number[];
    
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => MatchParticipantDto)
    participants?: MatchParticipantDto[];

    @IsOptional()
    @IsInt()
    winner_next_match_id?: number;

    @IsOptional()
    @IsInt()
    winner_next_match_slot?: number;
}