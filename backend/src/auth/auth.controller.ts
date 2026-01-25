import { Controller, Get, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service'
import { RegisterDto } from './dto/register-user.dto'
import { LoginDto } from './dto/login-user.dto'

@Controller('auth')
export class AuthController {
    constructor (private readonly authService: AuthService) {}
    
    @Post('register')
    register(@Body() dto: RegisterDto) {
        return this.authService.register(dto);
    }

    @Post('login')
    login(@Body() dto: LoginDto) {
        return this.authService.login(dto);
    }
}