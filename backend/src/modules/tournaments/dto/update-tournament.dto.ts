import { PartialType } from '@nestjs/mapped-types';
import { CreateTournamentDto } from './create-tournament.dto';
import { IsOptional, IsString, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreatePhaseDto } from './create-phase.dto';

export class UpdateTournamentDto extends PartialType(CreateTournamentDto) {
    @IsOptional()
    @IsString()
    status?: string;

    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreatePhaseDto)
    phases?: CreatePhaseDto[];
}