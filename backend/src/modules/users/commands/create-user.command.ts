// src/modules/users/commands/create-user.command.ts

import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { CreateUserDto } from '../dto/create-user.dto';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';

@Injectable()
export class CreateUserCommand {
    constructor(
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
    ) {}

    async execute(dto: CreateUserDto, isAuth2User = false): Promise<User> {
        const { username, mail, password } = dto;

        const existing = await this.userRepository.findOne({
            where: { mail },
            relations: ['profile', 'settings']
        });

        // 1. Logic for Auth2 Users (Find or Create)
        if (isAuth2User && existing) {
            return existing; 
        }

        // 2. Logic for Classic Users (Strict Unique Check)
        if (!isAuth2User && existing) {
            throw new ConflictException('User with this email already exists');
        }

        // 3. Check for unique username uniqueness
        const existingUsername = await this.userRepository.findOne({ where: { username } });
        if (existingUsername) {
            throw new ConflictException('Username is already taken');
        }
        // Handle password only if not a Auth2 user
        let hashedPassword = '';
        if (!isAuth2User && password) {
            hashedPassword = await bcrypt.hash(password, 10);
        } else {
            // For Auth2 users, generate a random long string so they can't 
            // "guess" an empty password to log in manually.
            hashedPassword = await bcrypt.hash(crypto.randomBytes(16).toString('hex'), 10);
        }

        const verificationToken = crypto.randomBytes(32).toString('hex');

        const user = this.userRepository.create({
            username,
            mail,
            passwordHash: hashedPassword,
            verificationToken,
            isEmailVerified: isAuth2User,
            profile: { 
                displayName: username,
                avatarUrl: (dto as any).picture 
            },
            settings: { language: 'en', theme: 0 },
        });

        return await this.userRepository.save(user);
    }
}