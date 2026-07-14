import { IsString, IsOptional, MinLength, MaxLength } from 'class-validator';

export class CreateOrganizationDto {
    @IsString()
    @MinLength(2)
    @MaxLength(50)
    name: string;

    @IsOptional()
    @IsString()
    @MaxLength(500)
    description?: string;
}
