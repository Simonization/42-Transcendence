import { IsString, Length } from 'class-validator';

export class Confirm2FaDto {
    @IsString()
    @Length(6, 6, { message: 'Code must be 6 digits' })
    code: string;
}
