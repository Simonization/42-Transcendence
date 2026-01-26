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
    UseGuards,
    Request
} from '@nestjs/common';

import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { UpdateProfileDto} from './dto/update-profile.dto'
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller('users')
export class UsersController {
    constructor(private readonly usersService: UsersService) {}

    @UseGuards(JwtAuthGuard)
    @Get('me')
    async getMe(@Request() req) {
        return await this.usersService.findOne(req.user.sub);
    }

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

    @Delete(':id')
    async remove(@Param('id', ParseIntPipe) id: number) {
        return await this.usersService.remove(id);
    }
}