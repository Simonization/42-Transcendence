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
import { ADMIN_ROLE, SUPER_ADMIN_ROLE } from '../users/constants/user-roles';

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

    private isBannedUser(user: Pick<User, 'status' | 'banUntil'>): boolean {
        return user.status === 1 || (!!user.banUntil && new Date(user.banUntil) > new Date());
    }
    
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
            select: ['id', 'username', 'mail', 'passwordHash', 'isEmailVerified', 'twoFactorEnabled', 'status', 'banUntil']
        })
        if (!user)
            throw new BadRequestException('Invalid credentials');

        if (this.isBannedUser(user)) {
            if (user.banUntil && new Date(user.banUntil) > new Date()) {
                throw new UnauthorizedException(`BANNED_UNTIL:${new Date(user.banUntil).toISOString()}`);
            }
            throw new UnauthorizedException('BANNED_PERMANENT');
        }

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

            const user = await this.userRepository.findOne({
                where: { id: payload.sub },
                select: ['id', 'status', 'banUntil'],
            });

            if (!user || this.isBannedUser(user)) {
                await this.refreshTokenRepository.delete({ userId: payload.sub });
                if (user?.banUntil && new Date(user.banUntil) > new Date()) {
                    throw new UnauthorizedException(`BANNED_UNTIL:${new Date(user.banUntil).toISOString()}`);
                }
                throw new UnauthorizedException('BANNED_PERMANENT');
            }
            
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
        } catch (error) {
            if (error instanceof UnauthorizedException) {
                const response = error.getResponse();
                const message = typeof response === 'string'
                    ? response
                    : (response as any)?.message;
                if (typeof message === 'string' && (message === 'BANNED_PERMANENT' || message.startsWith('BANNED_UNTIL:'))) {
                    throw error;
                }
            }
            throw new UnauthorizedException('Invalid refresh token');
        }
    }

    // ====================================
    // ADMIN INVITES
    // ====================================

    async createAdminInvite(createdByUserId: number, expiresInHours?: number) {
        const creator = await this.userRepository.findOne({
            where: { id: createdByUserId }
        });

        if (!creator) {
            throw new BadRequestException('Creator user not found');
        }

        if (creator.role !== SUPER_ADMIN_ROLE) {
            throw new BadRequestException('Only super admin can create admin invites');
        }

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

        // Check if any admin or super admin exists
        const superAdminsCount = await this.userRepository.count({ 
            where: { role: SUPER_ADMIN_ROLE } 
        });
        const adminsCount = await this.userRepository.count({ 
            where: { role: ADMIN_ROLE } 
        });

        if (superAdminsCount > 0 || adminsCount > 0) {
            throw new BadRequestException('Admin bootstrap is already completed');
        }

        const token = this.generateAdminToken();
        const expiresAt = this.getAdminInviteExpiration(expiresInHours);

        await this.adminInviteRepository.save({
            tokenHash: this.hashToken(token),
            expiresAt,
            isBootstrap: true,
        });

        return {
            token,
            expiresAt,
            message: 'Bootstrap admin invite created. This will create a super admin when redeemed.'
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

            // Determine role based on bootstrap status
            const newRole = invite.isBootstrap ? SUPER_ADMIN_ROLE : ADMIN_ROLE;
            const isAlreadyAdmin = user.role === ADMIN_ROLE || user.role === SUPER_ADMIN_ROLE;

            invite.usedAt = new Date();
            invite.usedByUserId = userId;
            await manager.getRepository(AdminInvite).save(invite);

            if (!isAlreadyAdmin) {
                user.role = newRole;
                await manager.getRepository(User).save(user);
            } else if (user.role === ADMIN_ROLE && invite.isBootstrap && newRole === SUPER_ADMIN_ROLE) {
                // Promote admin to super admin if using bootstrap invite
                user.role = SUPER_ADMIN_ROLE;
                await manager.getRepository(User).save(user);
            }

            return {
                message: 
                    invite.isBootstrap 
                        ? `User promoted to super admin successfully.`
                        : isAlreadyAdmin
                            ? 'User is already admin or super admin. Invite token consumed.'
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

    // ====================================
    // ADMIN MANAGEMENT
    // ====================================

    async listAdmins() {
        const admins = await this.userRepository.find({
            where: [
                { role: ADMIN_ROLE },
                { role: SUPER_ADMIN_ROLE }
            ],
            select: ['id', 'username', 'mail', 'role', 'createdAt']
        });

        return {
            admins: admins.map(admin => ({
                id: admin.id,
                username: admin.username,
                mail: admin.mail,
                role: admin.role === SUPER_ADMIN_ROLE ? 'super_admin' : 'admin',
                createdAt: admin.createdAt
            }))
        };
    }

    async revokeAdmin(superAdminId: number, adminId: number) {
        const user = await this.userRepository.findOne({
            where: { id: adminId }
        });

        if (!user) {
            throw new BadRequestException('User not found');
        }

        if (user.role !== ADMIN_ROLE && user.role !== SUPER_ADMIN_ROLE) {
            throw new BadRequestException('User is not an admin');
        }

        // Prevent revoking oneself
        if (superAdminId === adminId) {
            throw new BadRequestException('You cannot revoke your own admin status');
        }

        // Prevent super admin from revoking another super admin
        if (user.role === SUPER_ADMIN_ROLE) {
            throw new BadRequestException('Super admins can only revoke regular admins');
        }

        user.role = 0; // USER_ROLE
        await this.userRepository.save(user);

        return {
            message: `User ${user.username} has been revoked from admin role`
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