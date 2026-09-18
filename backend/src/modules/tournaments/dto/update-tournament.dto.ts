import { PartialType } from '@nestjs/mapped-types';
import { CreateTournamentDto } from './create-tournament.dto';
import { IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreatePhaseDto } from './create-phase.dto';

/**
 * `status` is deliberately not editable. Setting it to ONGOING here generated no matches and
 * then permanently locked out POST /:id/start, which requires REGISTRATION_OPEN. Status moves
 * only through `start` and the phase service.
 */
export class UpdateTournamentDto extends PartialType(CreateTournamentDto) {
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreatePhaseDto)
    phases?: CreatePhaseDto[];

}