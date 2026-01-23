// src/modules/users/commands/create-user.command.ts

import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { CreateUserDto } from '../dto/create-user.dto';
import bcrypt from 'node_modules/bcryptjs/umd/types';

@Injectable()
export class CreateUserCommand {
    constructor(
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
    ) {}

    async execute(dto: CreateUserDto): Promise<User> {
        const { username, mail, password } = dto;

        // 1. Check unique
        const existing = await this.userRepository.findOne({
            where: [{ username }, { mail }],
        });
        
        if (existing) {
            throw new ConflictException('User already exists');
        }

        // 2.1 Hash password
        const saltRounds = 10;

        const hashedPassword = await bcrypt.hash(dto.password, saltRounds);
        // 2.2 Setup object
        const user = this.userRepository.create({
            username,
            mail,
            passwordHash: hashedPassword,
            profile: { displayName: username },
            settings: { language: 'en', theme: 0 },
        });

        // 3. Save to MySQL
        return await this.userRepository.save(user);
    }
}