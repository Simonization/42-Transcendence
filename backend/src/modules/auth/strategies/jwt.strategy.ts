import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../users/entities/user.entity';

export interface JwtPayload {
    sub: number;
    username: string;
}

/**
 * JWT Strategy - Validates incoming JWT tokens
 * 
 * This strategy is automatically invoked by @UseGuards(JwtAuthGuard)
 * It extracts the JWT from the Authorization header, verifies its signature
 * using the secret key, and checks if it hasn't expired.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
    ) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
        });
    }

    /**
     * Validate JWT payload and retrieve user
     * 
     * This method is called automatically after the JWT signature is verified.
     * It receives the decoded payload and must return user data that will be
     * attached to the request object (req.user). If this method throws an error
     * or returns null/undefined, the request will be rejected with 401 Unauthorized.
     */
    async validate(payload: JwtPayload) {
        const user = await this.userRepository.findOne({
            where: { id: payload.sub },
            relations: ['profile', 'settings']
        });

        if (!user) {
            throw new UnauthorizedException();
        }

        return { sub: user.id, username: user.username, role: user.role };
    }
}
