import { GameType } from "../entities/match.entity";
import { IsInt, IsEnum, IsOptional, IsArray, ValidateNested, Type, IsObject, IsString } from 'class-validator';

export class CreateMatchDto {
    @IsEnum(GameType)
    game_type: GameType;

    @IsOptional()
    tournament_id?: number;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ParticipantDto)
    participants: ParticipantDto[];

    @IsObject()
    game_data: any; // PGN for Chess or JSON for League
}

class ParticipantDto {
    @IsInt()
    userId: number;

    @IsOptional()
    @IsInt()
    teamId?: number; // Blue=1, Red=2 for League

    @IsString()
    result: 'WIN' | 'LOSS' | 'DRAW' | 'PENDING';
}