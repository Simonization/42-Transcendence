import { IsString, IsNumber, Length } from 'class-validator';

export class Verify2FaDto {
    @IsNumber()
    userId: number;

    @IsString()
    @Length(6, 6, { message: 'Code must be 6 digits' })
    code: string;
}
