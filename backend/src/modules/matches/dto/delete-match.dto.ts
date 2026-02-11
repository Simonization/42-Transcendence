import { IsInt } from 'class-validator';

export class DeleteMatchDto {
    @IsInt()
    id: number;
}