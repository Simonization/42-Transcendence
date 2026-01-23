import {
    IsInt,
    IsPositive
} from 'class-validator';

export class UnblockUserDto {
    @IsInt()
    @IsPositive()
    targetId: number;
}