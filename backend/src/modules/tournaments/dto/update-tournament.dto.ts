import { PartialType } from '@nestjs/mapped-types';
import { CreateTournamentDto } from './create-tournament.dto';
import { IsOptional, IsArray, ValidateNested, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { CreatePhaseDto } from './create-phase.dto';
import { TournamentStatus } from '../entities/tournament.entity';

export class UpdateTournamentDto extends PartialType(CreateTournamentDto) {
    @IsOptional()
    @IsEnum(TournamentStatus)
    status?: TournamentStatus;

    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreatePhaseDto)
    phases?: CreatePhaseDto[];

}