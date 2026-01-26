import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { RegisterDto } from './dto/register-user.dto';
import { UsersService } from '../modules/users/users.service';
import { CreateUserDto } from '../modules/users/dto/create-user.dto';
import { LoginDto } from './dto/login-user.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../modules/users/entities/user.entity'
import { RefreshToken } from '../modules/users/entities/refresh-token.entity';
import { MailService } from '../mail/mail.service';
import * as bcrypt from 'bcryptjs';

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
            select: ['id', 'username', 'mail', 'passwordHash', 'isEmailVerified']
        })
        if (!user)
            throw new BadRequestException('Invalid credentials');
        const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
        if (!isPasswordValid)
            throw new BadRequestException('Invalid credentials');
        
        if (!user.isEmailVerified) {
            throw new UnauthorizedException('Please verify your email address before logging in');
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
}