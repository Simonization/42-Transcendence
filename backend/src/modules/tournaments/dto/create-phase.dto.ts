import { 
    IsString, 
    IsInt, 
    IsOptional, 
    IsArray, 
    ValidateNested, 
    IsEnum, 
    Min, 
    Max 
} from 'class-validator';
import { Type } from 'class-transformer';

export enum PhaseType {
    SINGLE_ELIMINATION = 'SINGLE_ELIMINATION',
    DOUBLE_ELIMINATION = 'DOUBLE_ELIMINATION',
    ROUND_ROBIN = 'ROUND_ROBIN',
    SWISS = 'SWISS',
    GROUP_STAGE = 'GROUP_STAGE'
}

export class CreatePhaseDto {
    @IsInt()
    @Min(1)
    order: number;

    @IsEnum(PhaseType)
    type: PhaseType;

    @IsInt()
    game_id: number;

    @IsInt()
    @Min(2)
    teams_limit_start: number;

    @IsInt()
    @Min(1)
    teams_limit_end: number;

    @IsOptional()
    @IsInt()
    @Min(1)
    swiss_rounds?: number;

    @IsOptional()
    @IsInt()
    @Min(2)
    group_size?: number;

    @IsOptional()
    @IsInt()
    @Min(1)
    group_winners_count?: number;
}

export class CreateTournamentDto {
    @IsString()
    name: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsInt()
    @Min(2)
    @Max(1024)
    max_participants: number;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreatePhaseDto)
    phases: CreatePhaseDto[];
}