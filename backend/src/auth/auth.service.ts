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
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
    constructor(
        private readonly usersService: UsersService,
        private readonly jwtService: JwtService,
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
        return (await this.usersService.create(createUserDto));
    }
    async login(dto: LoginDto)
    {
        const user = await this.userRepository.findOne({
            where: { username: dto.username },
            select: ['id', 'username', 'mail', 'passwordHash']
        })
        if (!user)
            throw new BadRequestException('Invalid credentials');
        const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
        if (!isPasswordValid)
            throw new BadRequestException('Invalid credentials');
        
        // Generate Access Token
        const payload = { sub: user.id, username: user.username };
        const accessToken = this.jwtService.sign(payload);
        
        // Generate Refresh Token
        const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });
        
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

    async refresh(refreshToken: string) {
        try {
            const payload = await this.jwtService.verifyAsync(refreshToken);
            
            // Vérifier que le token existe en DB et n'est pas expiré
            const storedToken = await this.refreshTokenRepository.findOne({
                where: { token: refreshToken, userId: payload.sub },
            });

            if (!storedToken || new Date() > storedToken.expiresAt) {
                throw new UnauthorizedException('Invalid or expired refresh token');
            }

            // Générer un nouveau access token
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