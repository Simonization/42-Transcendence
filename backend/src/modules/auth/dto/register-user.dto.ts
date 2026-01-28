import {
    IsEmail,
    IsNotEmpty,
    IsString,
    MinLength
} from 'class-validator'

export class RegisterDto {
    @IsString()
    @IsNotEmpty()
    username: string;

    @IsEmail({}, { message: 'Please provide a valid email address' })
    mail: string;

    @IsString()
    @MinLength(8, { message: 'Password must be at least 8 characters long' })
    password: string;
}