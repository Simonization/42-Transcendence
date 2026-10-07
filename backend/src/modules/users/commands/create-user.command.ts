// src/modules/users/commands/create-user.command.ts

import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { CreateUserDto } from '../dto/create-user.dto';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';

/** Fresh usernames tried for one Google sign-up before giving up with a 409. */
export const OAUTH_USERNAME_ATTEMPTS = 10;

/**
 * `base` plus a random number. The range grows every third attempt (1000, 10^4, 10^5, 10^6) so
 * a popular base cannot exhaust it.
 */
export function oauthUsernameCandidate(base: string, attempt: number): string {
    const range = 1000 * 10 ** Math.floor(attempt / 3);
    return `${base}${Math.floor(Math.random() * range)}`;
}

const isUniqueViolation = (e: unknown): boolean =>
    e instanceof QueryFailedError && (e as QueryFailedError & { driverError?: { code?: string } }).driverError?.code === '23505';

@Injectable()
export class CreateUserCommand {
    constructor(
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
    ) {}

    /**
     * Classic sign-up (`isAuth2User` false): `dto.username` is the username, taken or not.
     * Google sign-in (`isAuth2User` true): find by mail or create; `dto.username` is only the
     * base of the generated username, which gets a fresh random suffix until it is free.
     */
    async execute(dto: CreateUserDto, isAuth2User = false): Promise<User> {
        if (isAuth2User) return this.findOrCreateOAuthUser(dto);

        const { username, mail, password } = dto;

        const existing = await this.userRepository.findOne({
            where: { mail },
            relations: ['profile', 'settings']
        });

        // Strict unique check
        if (existing) {
            throw new ConflictException('User with this email already exists');
        }

        // Check for unique username uniqueness
        const existingUsername = await this.userRepository.findOne({ where: { username } });
        if (existingUsername) {
            throw new ConflictException('Username is already taken');
        }

        const passwordHash = password ? await bcrypt.hash(password, 10) : await this.randomPasswordHash();
        return this.insert(username, mail, passwordHash, (dto as any).picture, false);
    }

    private async findOrCreateOAuthUser(dto: CreateUserDto): Promise<User> {
        const { username: base, mail } = dto;
        // For OAuth users the password is a random long string, so nobody can "guess" an empty
        // one to log in manually.
        const passwordHash = await this.randomPasswordHash();

        for (let attempt = 0; attempt < OAUTH_USERNAME_ATTEMPTS; attempt++) {
            const existing = await this.userRepository.findOne({
                where: { mail },
                relations: ['profile', 'settings']
            });
            if (existing) return existing;

            const username = oauthUsernameCandidate(base, attempt);
            if (await this.userRepository.findOne({ where: { username } })) continue;

            try {
                return await this.insert(username, mail, passwordHash, (dto as any).picture, true);
            } catch (e) {
                // Another request took this username (or this mail) since the checks above:
                // go round again, which finds the mail or draws a new suffix.
                if (isUniqueViolation(e)) continue;
                throw e;
            }
        }
        throw new ConflictException('Could not generate a free username, please try again');
    }

    private randomPasswordHash(): Promise<string> {
        return bcrypt.hash(crypto.randomBytes(16).toString('hex'), 10);
    }

    private insert(username: string, mail: string, passwordHash: string, picture: string | undefined, verified: boolean): Promise<User> {
        const user = this.userRepository.create({
            username,
            mail,
            passwordHash,
            verificationToken: crypto.randomBytes(32).toString('hex'),
            isEmailVerified: verified,
            profile: {
                displayName: username,
                avatarUrl: picture
            },
            settings: { language: 'en', theme: 0 },
        });

        return this.userRepository.save(user);
    }
}
