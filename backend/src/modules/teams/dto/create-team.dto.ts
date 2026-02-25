import { IsString, IsInt, MinLength, MaxLength } from 'class-validator';

export class CreateTeamDto {
  @IsString()
  @MinLength(3)
  @MaxLength(32)
  name: string;

  @IsInt()
  tournament_id: number;
}