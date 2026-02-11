import { GameType } from "../entities/match.entity";
import { IsInt, IsOptional, IsObject } from 'class-validator';

export class UpdateMatchDto {
    @IsOptional()
    @IsObject()
    game_data?: any;

    @IsOptional()
    @IsInt()
    tournament_id?: number;
}