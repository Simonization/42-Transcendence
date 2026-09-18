// src/modules/users/users.controller.ts

import {
    Controller,
    Body,
    Patch,
    Param,
    Delete,
    ForbiddenException,
    ParseIntPipe,
    Get,
    Query,
    UseGuards,
    Request
} from '@nestjs/common';

import { UsersService } from './users.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { UpdateProfileDto} from './dto/update-profile.dto'
import { UpdateAdminUserDto } from './dto/update-admin-user.dto'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { User } from './entities/user.entity';
import { AdminGuard } from '../auth/guards/admin.guard';
import { ADMIN_ROLE, SUPER_ADMIN_ROLE } from './constants/user-roles';

@Controller('users')
export class UsersController {
    constructor(
        private readonly usersService: UsersService,
       @InjectRepository(User) private readonly userRepo: Repository<User>
    ) {}

    /** These routes take the target id in the path, so ownership has to be checked per call. */
    private assertSelfOrAdmin(req, targetId: number): void {
        const actorId = Number(req.user?.sub);
        const role = req.user?.role;
        const isAdmin = role === ADMIN_ROLE || role === SUPER_ADMIN_ROLE;

        if (actorId !== targetId && !isAdmin) {
            throw new ForbiddenException('You can only modify your own account');
        }
    }

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

    /** Admin-only: the payload includes every user's email address. */
    @UseGuards(JwtAuthGuard, AdminGuard)
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

    @UseGuards(JwtAuthGuard)
    @Patch(':id/settings')
    async updateSettings(
        @Param('id', ParseIntPipe) id: number,
        @Body() updateSettingsDto: UpdateSettingsDto,
        @Request() req,
    ) {
        this.assertSelfOrAdmin(req, id);
        return await this.usersService.updateSettings(id, updateSettingsDto);
    }

    @UseGuards(JwtAuthGuard)
    @Patch(':id/profile')
    async updateProfile(
        @Param('id', ParseIntPipe) id: number,
        @Body() updateProfileDto: UpdateProfileDto,
        @Request() req,
    ) {
        this.assertSelfOrAdmin(req, id);
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

    @UseGuards(JwtAuthGuard)
    @Delete(':id')
    async remove(@Param('id', ParseIntPipe) id: number, @Request() req) {
        this.assertSelfOrAdmin(req, id);
        return await this.usersService.remove(id);
    }
}