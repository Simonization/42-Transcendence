import { IsString, IsInt, IsOptional, Min, Max } from 'class-validator';

export class UpdateGameDto {
    @IsOptional()
    @IsString()
    name?: string;

    @IsOptional()
    @IsInt()
    @Min(2)
    @Max(100)
    team_count?: number;

    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(20)
    team_size?: number;
}