import { Type } from 'class-transformer';
import {
    IsInt,
    IsOptional,
    IsArray,
    ValidateNested,
    IsString,
    IsDateString,
    ValidateIf,
} from 'class-validator';
import { CreatePhaseDto } from './create-phase.dto';

export class CreateTournamentDto {
    @IsString()
    name: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsInt()
    max_participants?: number;

    @IsOptional()
    @ValidateIf((o) => o.scheduled_at !== null)
    @IsDateString()
    scheduled_at?: string | null;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreatePhaseDto)
    phases: CreatePhaseDto[];
}