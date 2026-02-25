import { IsString, IsInt, Min, Max } from 'class-validator';

export class CreateGameDto {
    @IsString()
    name: string;

    @IsInt()
    @Min(2) // Minimum a match needs a winner and a loser
    @Max(100)
    team_count: number;

    @IsInt()
    @Min(1)
    @Max(20)
    team_size: number;
}