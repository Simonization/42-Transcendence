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
import { IsNotAfter } from './not-after.validator';

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

    /** Registration is refused from this time on. Must not be after `scheduled_at`. */
    @IsOptional()
    @ValidateIf((o) => o.registration_closes_at !== null)
    @IsDateString()
    @IsNotAfter('scheduled_at')
    registration_closes_at?: string | null;

    /** Check-in opens at this time and runs until the tournament starts. Must not be after `scheduled_at`. */
    @IsOptional()
    @ValidateIf((o) => o.checkin_opens_at !== null)
    @IsDateString()
    @IsNotAfter('scheduled_at')
    checkin_opens_at?: string | null;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreatePhaseDto)
    phases: CreatePhaseDto[];
}