import { Controller, Get, Post, Body, UseGuards, Request } from '@nestjs/common';
import { BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service'
import { RegisterDto } from './dto/register-user.dto'
import { LoginDto } from './dto/login-user.dto'
import { OptionalJwtAuthGuard } from './guards/optional-jwt-auth.guard';

export class RefreshDto {
    refreshToken: string;
}

@Controller('auth')
export class AuthController {
    constructor (private readonly authService: AuthService) {}
    
    @Post('register')
    @UseGuards(OptionalJwtAuthGuard)
    register(@Body() dto: RegisterDto, @Request() req) {
        if (req.user)
            throw new BadRequestException('Already logged in');
        return (this.authService.register(dto));
    }

    @Post('login')
    @UseGuards(OptionalJwtAuthGuard)
    login(@Body() dto: LoginDto, @Request() req) {
        if (req.user)
            throw new BadRequestException('Already logged in');
        return (this.authService.login(dto));
    }

    @Post('refresh')
    refresh(@Body() dto: RefreshDto) {
        return this.authService.refresh(dto.refreshToken);
    }
}