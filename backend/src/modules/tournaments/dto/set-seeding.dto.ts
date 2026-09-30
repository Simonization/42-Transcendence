import { ArrayMaxSize, IsArray, IsInt } from 'class-validator';

export class SetSeedingDto {
    /** Team ids, seed 1 first. */
    @IsArray()
    @ArrayMaxSize(1024)
    @IsInt({ each: true })
    teamIds: number[];
}
