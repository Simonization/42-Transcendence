import { Injectable } from '@nestjs/common';
import { RegisterDto } from './dto/register-user.dto';
import { LoginDto } from './dto/login-user.dto';

@Injectable()
export class AuthService {
    register(dto: RegisterDto)
    {}
    login(dto: LoginDto)
    {}
}