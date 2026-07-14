// src/modules/users/users.controller.ts

import {
    Controller,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    ParseIntPipe,
    Get,
    Query,
    UseGuards,
    Request
} from '@nestjs/common';

import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { UpdateProfileDto} from './dto/update-profile.dto'
import { UpdateAdminUserDto } from './dto/update-admin-user.dto'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { User } from './entities/user.entity';
import { AdminGuard } from '../auth/guards/admin.guard';

@Controller('users')
export class UsersController {
    constructor(
        private readonly usersService: UsersService,
       @InjectRepository(User) private readonly userRepo: Repository<User>
    ) {}

    @UseGuards(JwtAuthGuard)
    @Get('search')
    async search(
        @Query('q') q?: string,
        @Query('limit') limit?: string,
    ) {
        return await this.usersService.search(q ?? '', parseInt(limit ?? '50', 10));
    }

    @UseGuards(JwtAuthGuard)
    @Get('me')
    async getMe(@Request() req) {
        return await this.usersService.findOne(req.user.sub);
    }

    @UseGuards(JwtAuthGuard)
    @Get()
    async getAllUsers(
        @Query('page') page: string = '1',
        @Query('limit') limit: string = '20',
        @Query('q') search?: string,
    ) {
        return await this.usersService.getAllUsers(
            parseInt(page, 10),
            parseInt(limit, 10),
            search,
        );
    }

    // @UseGuards(JwtAuthGuard)
    // @Get('search')
    // async searchUsers(@Query('q') search: string) {
    //     return await this.usersService.getAllUsers(1, 10, search);
    // }

    @Post()
    async create(@Body() createUserDto: CreateUserDto) {
        return await this.usersService.create(createUserDto);
    }

    @Patch(':id/settings')
    async updateSettings(
        @Param('id', ParseIntPipe) id: number,
        @Body() updateSettingsDto: UpdateSettingsDto,
    ) {
        return await this.usersService.updateSettings(id, updateSettingsDto);
    }

    @Patch(':id/profile')
    async updateProfile(
        @Param('id', ParseIntPipe) id: number,
        @Body() updateProfileDto: UpdateProfileDto,
    ) {
        return await this.usersService.updateProfile(id, updateProfileDto);
    }

    @UseGuards(JwtAuthGuard, AdminGuard)
    @Patch(':id')
    async adminUpdateUser(
        @Param('id', ParseIntPipe) id: number,
        @Body() updateAdminUserDto: UpdateAdminUserDto,
    ) {
        return await this.usersService.adminUpdateUser(id, updateAdminUserDto);
    }

    @Delete(':id')
    async remove(@Param('id', ParseIntPipe) id: number) {
        return await this.usersService.remove(id);
    }
}