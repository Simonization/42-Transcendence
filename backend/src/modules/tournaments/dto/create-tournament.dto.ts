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

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreatePhaseDto)
    phases: CreatePhaseDto[];
}