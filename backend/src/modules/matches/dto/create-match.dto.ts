import { Type } from 'class-transformer';
import { 
    IsInt, 
    IsEnum, 
    IsOptional, 
    IsArray, 
    ValidateNested, 
    IsObject, 
    IsString 
} from 'class-validator';
import { GameType } from "../entities/match.entity";

export class ParticipantDto {
    @IsInt()
    userId: number;

    @IsOptional()
    @IsInt()
    teamId?: number; 

    @IsString()
    result: 'WIN' | 'LOSS' | 'DRAW' | 'PENDING';
}

export class CreateMatchDto {
    @IsEnum(GameType)
    game_type: GameType;

    @IsOptional()
    @IsInt() // Added missing validation for the ID itself
    tournament_id?: number;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ParticipantDto) // Now ParticipantDto is defined and accessible
    participants: ParticipantDto[];

    @IsObject()
    game_data: any; 
}