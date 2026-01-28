import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { RegisterDto } from './dto/register-user.dto';
import { UsersService } from '../users/users.service';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { LoginDto } from './dto/login-user.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity'
import { RefreshToken } from '../users/entities/refresh-token.entity';
import { MailService } from '../mail/mail.service';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
    constructor(
        private readonly usersService: UsersService,
        private readonly jwtService: JwtService,
        private readonly mailService: MailService,
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
        @InjectRepository(RefreshToken)
        private readonly refreshTokenRepository: Repository<RefreshToken>,
    ) {}
    
    async register(dto: RegisterDto) {
        const createUserDto: CreateUserDto = {
            username: dto.username,
            mail: dto.mail,
            password: dto.password,
        };
        const user = await this.usersService.create(createUserDto);
        
        // Send verification email
        try {
            if (user.verificationToken) {
                await this.mailService.sendVerificationEmail(
                    user.mail,
                    user.verificationToken,
                    user.username
                );
            }
        } catch (error) {
            console.error('Failed to send verification email:', error);
        }
        
        return {
            message: 'Registration successful. Please check your email to verify your account.',
            user: {
                id: user.id,
                username: user.username,
                mail: user.mail,
                isEmailVerified: user.isEmailVerified
            }
        };
    }
    async login(dto: LoginDto)
    {
        const user = await this.userRepository.findOne({
            where: { username: dto.username },
            select: ['id', 'username', 'mail', 'passwordHash', 'isEmailVerified', 'twoFactorEnabled']
        })
        if (!user)
            throw new BadRequestException('Invalid credentials');
        const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
        if (!isPasswordValid)
            throw new BadRequestException('Invalid credentials');
        
        if (!user.isEmailVerified) {
            throw new UnauthorizedException('Please verify your email address before logging in');
        }

        // If 2FA is enabled, generate and send code - don't login yet
        if (user.twoFactorEnabled) {
            // Generate a 6-digit code
            const code = Math.floor(100000 + Math.random() * 900000).toString();
            
            // Store the code temporarily
            user.twoFactorCode = code;
            await this.userRepository.save(user);

            // Send the code via email
            try {
                await this.mailService.send2FACode(user.mail, code, user.username);
            } catch (error) {
                console.error('Failed to send 2FA code:', error);
                throw new BadRequestException('Failed to send verification code');
            }

            return {
                requiresTwoFactor: true,
                userId: user.id,
                message: 'Verification code sent to your email. Please enter it to continue.'
            };
        }

        // Generate Access Token
        const payload = { sub: user.id, username: user.username };
        const accessToken = this.jwtService.sign(payload);
        
        // Generate Refresh Token
        const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });
        
        // Single session (delete the old refresh token)
        await this.refreshTokenRepository.delete({ userId: user.id });
        
        // Save Refresh Token to DB
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);
        
        await this.refreshTokenRepository.save({
            token: refreshToken,
            userId: user.id,
            expiresAt,
        });
        
        return ({
            user: {
                id: user.id,
                username: user.username,
                mail: user.mail
            },
            accessToken,
            refreshToken
        });
    }

    async logout(userId: number) {
        await this.refreshTokenRepository.delete({ userId });
        return { message: 'Logged out successfully' };
    }

    async verifyEmail(token: string) {
        const user = await this.userRepository.findOne({
            where: { verificationToken: token }
        });

        if (!user) {
            throw new BadRequestException('Invalid or expired verification token');
        }

        user.isEmailVerified = true;
        user.verificationToken = undefined;
        await this.userRepository.save(user);

        return {
            message: 'Email verified successfully! You can now log in.'
        };
    }

    async refresh(refreshToken: string) {
        try {
            const payload = await this.jwtService.verifyAsync(refreshToken);
            
            const storedToken = await this.refreshTokenRepository.findOne({
                where: { token: refreshToken, userId: payload.sub },
            });

            if (!storedToken || new Date() > storedToken.expiresAt) {
                throw new UnauthorizedException('Invalid or expired refresh token');
            }

            const newPayload = { sub: payload.sub, username: payload.username };
            const newAccessToken = this.jwtService.sign(newPayload);

            return {
                accessToken: newAccessToken,
            };
        } catch {
            throw new UnauthorizedException('Invalid refresh token');
        }
    }

    // ====================================
    // TWO-FACTOR AUTHENTICATION METHODS
    // ====================================

    async enable2FA(userId: number) {
        const user = await this.userRepository.findOne({ where: { id: userId } });
        if (!user) {
            throw new BadRequestException('User not found');
        }

        // Generate a 6-digit code
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Store the code temporarily (will expire in 10 minutes)
        user.twoFactorCode = code;
        await this.userRepository.save(user);

        // Send the code via email
        try {
            await this.mailService.send2FACode(user.mail, code, user.username);
        } catch (error) {
            console.error('Failed to send 2FA code:', error);
            throw new BadRequestException('Failed to send verification code');
        }

        return {
            message: 'A verification code has been sent to your email address',
        };
    }

    async confirm2FA(userId: number, code: string) {
        const user = await this.userRepository.findOne({
            where: { id: userId },
            select: ['id', 'twoFactorCode']
        });

        if (!user) {
            throw new BadRequestException('User not found');
        }

        if (user.twoFactorCode !== code) {
            throw new BadRequestException('Invalid verification code');
        }

        // Enable 2FA
        user.twoFactorEnabled = true;
        user.twoFactorCode = undefined;
        await this.userRepository.save(user);

        return {
            message: 'Two-factor authentication has been enabled successfully'
        };
    }

    async verify2FA(userId: number, code: string) {
        const user = await this.userRepository.findOne({
            where: { id: userId },
            select: ['id', 'username', 'twoFactorCode', 'twoFactorEnabled']
        });

        if (!user || !user.twoFactorEnabled) {
            throw new BadRequestException('Two-factor authentication is not enabled');
        }

        if (user.twoFactorCode !== code) {
            throw new BadRequestException('Invalid verification code');
        }

        // Generate tokens for login
        const payload = { sub: user.id, username: user.username };
        const accessToken = this.jwtService.sign(payload);
        const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

        // Single session
        await this.refreshTokenRepository.delete({ userId: user.id });

        // Save Refresh Token to DB
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        await this.refreshTokenRepository.save({
            token: refreshToken,
            userId: user.id,
            expiresAt,
        });

        return {
            user: {
                id: user.id,
                username: user.username,
            },
            accessToken,
            refreshToken
        };
    }

    async disable2FA(userId: number) {
        const user = await this.userRepository.findOne({ where: { id: userId } });
        if (!user) {
            throw new BadRequestException('User not found');
        }

        user.twoFactorEnabled = false;
        user.twoFactorCode = undefined;
        await this.userRepository.save(user);

        return {
            message: 'Two-factor authentication has been disabled'
        };
    }
}