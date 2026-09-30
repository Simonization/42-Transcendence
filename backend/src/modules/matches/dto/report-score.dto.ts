import { IsInt, Max, Min } from 'class-validator';

/** Scores in slot order: team1Score belongs to the match's team1. Draws are refused. */
export class ReportScoreDto {
    @IsInt()
    @Min(0)
    @Max(9999)
    team1Score: number;

    @IsInt()
    @Min(0)
    @Max(9999)
    team2Score: number;
}
