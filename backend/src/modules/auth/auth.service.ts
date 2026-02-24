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
import { AdminInvite } from './entities/admin-invite.entity';
import { MailService } from '../mail/mail.service';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { ADMIN_ROLE } from '../users/constants/user-roles';

const DEFAULT_ADMIN_INVITE_EXPIRATION_HOURS = 24;

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
        @InjectRepository(AdminInvite)
        private readonly adminInviteRepository: Repository<AdminInvite>,
    ) {}
    
    // create user and send verification email
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
    
    //verify credentials and handle 2FA if enabled
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

        // If 2FA enabled, send code
        if (user.twoFactorEnabled) {
            // Generate a 6-digit code
            const code = Math.floor(100000 + Math.random() * 900000).toString();
            
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

        // Generate access and refresh tokens
        const payload = { sub: user.id, username: user.username };
        const accessToken = this.jwtService.sign(payload);
        const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });
        
        // Ensure single active session
        await this.refreshTokenRepository.delete({ userId: user.id });
        
        // Save the new refresh token
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

    // delete refresh token
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

    // Refresh the access token
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
    // ADMIN INVITES
    // ====================================

    async createAdminInvite(createdByUserId: number, expiresInHours?: number) {
        const token = this.generateAdminToken();
        const expiresAt = this.getAdminInviteExpiration(expiresInHours);

        await this.adminInviteRepository.save({
            tokenHash: this.hashToken(token),
            createdByUserId,
            expiresAt,
        });

        return {
            token,
            expiresAt,
        };
    }

    async createAdminInviteWithBootstrap(secret: string, expiresInHours?: number) {
        const bootstrapSecret = process.env.ADMIN_BOOTSTRAP_SECRET;
        if (!bootstrapSecret) {
            throw new BadRequestException('Admin bootstrap secret is not configured');
        }

        if (secret !== bootstrapSecret) {
            throw new BadRequestException('Invalid bootstrap secret');
        }

        const adminsCount = await this.userRepository.count({ where: { role: ADMIN_ROLE } });
        if (adminsCount > 0) {
            throw new BadRequestException('Admin bootstrap is already completed');
        }

        const token = this.generateAdminToken();
        const expiresAt = this.getAdminInviteExpiration(expiresInHours);

        await this.adminInviteRepository.save({
            tokenHash: this.hashToken(token),
            expiresAt,
        });

        return {
            token,
            expiresAt,
        };
    }

    async redeemAdminInvite(userId: number, token: string) {
        const tokenHash = this.hashToken(token);

        return this.adminInviteRepository.manager.transaction(async (manager) => {
            const user = await manager.getRepository(User).findOne({ where: { id: userId } });
            if (!user) {
                throw new BadRequestException('User not found');
            }

            const invite = await manager.getRepository(AdminInvite).findOne({
                where: { tokenHash },
            });

            if (!invite) {
                throw new BadRequestException('Invalid admin invite token');
            }

            if (invite.usedAt) {
                throw new BadRequestException('Admin invite token already used');
            }

            if (invite.expiresAt && new Date() > invite.expiresAt) {
                throw new BadRequestException('Admin invite token expired');
            }

            const alreadyAdmin = user.role === ADMIN_ROLE;

            invite.usedAt = new Date();
            invite.usedByUserId = userId;
            await manager.getRepository(AdminInvite).save(invite);

            if (!alreadyAdmin) {
                user.role = ADMIN_ROLE;
                await manager.getRepository(User).save(user);
            }

            return {
                message: alreadyAdmin
                    ? 'User is already admin. Invite token consumed.'
                    : 'User promoted to admin successfully.',
            };
        });
    }

    // ====================================
    // TWO-FACTOR AUTHENTICATION METHODS
    // ====================================

    // generate and send code
    async enable2FA(userId: number) {
        const user = await this.userRepository.findOne({ where: { id: userId } });
        if (!user) {
            throw new BadRequestException('User not found');
        }

        const code = Math.floor(100000 + Math.random() * 900000).toString();
        
        user.twoFactorCode = code;
        await this.userRepository.save(user);

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

        // Enable 2FA and clear temporary code
        user.twoFactorEnabled = true;
        user.twoFactorCode = undefined;
        await this.userRepository.save(user);

        return {
            message: 'Two-factor authentication has been enabled successfully'
        };
    }

    // Verify 2FA code during login
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

        // Valid code -> generate tokens for login
        const payload = { sub: user.id, username: user.username };
        const accessToken = this.jwtService.sign(payload);
        const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

        await this.refreshTokenRepository.delete({ userId: user.id });

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

    // Disable 2FA
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

    /***       OAUTH 2.0        ***/

    private async generateAuthTokens(userId: number, username: string) {
        const payload = { sub: userId, username: username };
        const accessToken = this.jwtService.sign(payload);
        const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });
        await this.refreshTokenRepository.delete({ userId });
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);
        await this.refreshTokenRepository.save({
            token: refreshToken,
            userId: userId,
            expiresAt,
    });

    return { accessToken, refreshToken };
}

    async googleLogin(googleUser: any) {
        let user = await this.userRepository.findOne({ 
            where: { mail: googleUser.mail } 
        });

        if (!user) {
            const newUser = this.userRepository.create({
                username: googleUser.email.split('@')[0] + Math.floor(Math.random() * 1000),
                mail: googleUser.email,
                firstName: googleUser.firstName,
                lastName: googleUser.lastName,
                avatarUrl: googleUser.picture,
                passwordHash: 'OAUTH_USER',
                isEmailVerified: true,
            });
            user = await this.userRepository.save(newUser);
            user.firstName = googleUser.firstName;
            user.lastName = googleUser.lastName;
            user.avatarUrl = googleUser.picture;
        }
        if (user.twoFactorEnabled) {
            const code = Math.floor(100000 + Math.random() * 900000).toString();
            user.twoFactorCode = code;
            await this.userRepository.save(user);

            try {
                await this.mailService.send2FACode(user.mail, code, user.username);
            } catch (error) {
                throw new BadRequestException('Failed to send 2FA code');
            }

            return {
                requiresTwoFactor: true,
                userId: user.id,
                message: '2FA required'
            };
        }
        const tokens = await this.generateAuthTokens(user.id, user.username);
        return {
            user: {
                id: user.id,
                username: user.username,
                mail: user.mail
            },
            ...tokens
        };
    }

    private generateAdminToken(): string {
        return crypto.randomBytes(32).toString('base64url');
    }

    private hashToken(token: string): string {
        return crypto.createHash('sha256').update(token).digest('hex');
    }

    private getAdminInviteExpiration(expiresInHours?: number): Date {
        const hours = expiresInHours ?? DEFAULT_ADMIN_INVITE_EXPIRATION_HOURS;
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + hours);
        return expiresAt;
    }
}