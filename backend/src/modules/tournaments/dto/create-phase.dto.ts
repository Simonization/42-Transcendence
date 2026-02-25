import { 
    IsInt, 
    IsEnum, 
    Min 
} from 'class-validator';

export class CreatePhaseDto {
    @IsInt()
    @Min(1)
    order: number;

    @IsEnum(['SINGLE_ELIMINATION', 'DOUBLE_ELIMINATION', 'ROUND_ROBIN'])
    type: string;

    @IsInt()
    game_id: number;
}