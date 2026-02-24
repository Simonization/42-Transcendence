import { Controller, Get, Post, Body, UseGuards, Request, Query } from '@nestjs/common';
import { BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service'
import { RegisterDto } from './dto/register-user.dto'
import { LoginDto } from './dto/login-user.dto'
import { Verify2FaDto } from './dto/verify-2fa.dto'
import { Confirm2FaDto } from '../users/dto/confirm-2fa.dto'
import { CreateAdminInviteDto } from './dto/create-admin-invite.dto';
import { BootstrapAdminInviteDto } from './dto/bootstrap-admin-invite.dto';
import { RedeemAdminInviteDto } from './dto/redeem-admin-invite.dto';
import { OptionalJwtAuthGuard } from './guards/optional-jwt-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AdminGuard } from './guards/admin.guard';
import { AuthGuard } from '@nestjs/passport';
import { Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleAuthGuard } from './guards/google-auth.guard';

export class RefreshDto {
    refreshToken: string;
}

@Controller('auth')
export class AuthController {
    constructor (
        private readonly authService: AuthService,
        private readonly configService: ConfigService
    ) {}
    
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

    @Get('verify-email')
    verifyEmail(@Query('token') token: string) {
        if (!token) {
            throw new BadRequestException('Verification token is required');
        }
        return this.authService.verifyEmail(token);
    }

    @Post('logout')
    @UseGuards(JwtAuthGuard)
    logout(@Request() req) {
        return this.authService.logout(req.user.sub);
    }

    @Post('refresh')
    refresh(@Body() dto: RefreshDto) {
        return this.authService.refresh(dto.refreshToken);
    }

    // ====================================
    // ADMIN INVITES
    // ====================================

    @Post('admin-invites')
    @UseGuards(JwtAuthGuard, AdminGuard)
    createAdminInvite(@Request() req, @Body() dto: CreateAdminInviteDto) {
        return this.authService.createAdminInvite(req.user.sub, dto.expiresInHours);
    }

    @Post('admin-invites/bootstrap')
    createAdminInviteBootstrap(@Body() dto: BootstrapAdminInviteDto) {
        return this.authService.createAdminInviteWithBootstrap(dto.secret, dto.expiresInHours);
    }

    @Post('admin-invites/redeem')
    @UseGuards(JwtAuthGuard)
    redeemAdminInvite(@Request() req, @Body() dto: RedeemAdminInviteDto) {
        return this.authService.redeemAdminInvite(req.user.sub, dto.token);
    }

    // ====================================
    // TWO-FACTOR AUTHENTICATION ENDPOINTS
    // ====================================

    @Post('2fa/enable')
    @UseGuards(JwtAuthGuard)
    enable2FA(@Request() req) {
        return this.authService.enable2FA(req.user.sub);
    }

    @Post('2fa/confirm')
    @UseGuards(JwtAuthGuard)
    confirm2FA(@Request() req, @Body() dto: Confirm2FaDto) {
        return this.authService.confirm2FA(req.user.sub, dto.code);
    }

    @Post('2fa/verify')
    verify2FA(@Body() dto: Verify2FaDto) {
        if (!dto.userId) {
            throw new BadRequestException('User ID is required');
        }
        return this.authService.verify2FA(dto.userId, dto.code);
    }

    @Post('2fa/disable')
    @UseGuards(JwtAuthGuard)
    disable2FA(@Request() req) {
        return this.authService.disable2FA(req.user.sub);
    }



    /***       OAUTH 2.0        ***/
    
    @Get('google')
    @UseGuards(GoogleAuthGuard)
    async googleAuth(@Request() req) {

    }

    @Get('google/callback')
    @UseGuards(GoogleAuthGuard)
    async googleAuthRedirect(@Request() req, @Res() res) {
        const frontendUrl = this.configService.get<string>('FRONTEND_URL');
        const result = await this.authService.googleLogin(req.user);
        if ('accessToken' in result) {
            // const successUrl = `http://localhost/login-success?accessToken=${result.accessToken}&refreshToken=${result.refreshToken}`;
            const successUrl = `${frontendUrl}/login-success?accessToken=${result.accessToken}&refreshToken=${result.refreshToken}`;
            return res.redirect(successUrl);
        } else {
            // const twoFactorUrl = `http://localhost/verify-2fa?userId=${result.userId}&googleLogin=true`;
            const twoFactorUrl = `${frontendUrl}/verify-2fa?userId=${result.userId}&googleLogin=true`;
            return res.redirect(twoFactorUrl);
        }
    }
}