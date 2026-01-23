// src/modules/users/users.controller.ts

import { 
    Controller, 
    Post, 
    Body, 
    Patch, 
    Param, 
    Delete, 
    ParseIntPipe 
} from '@nestjs/common';

import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateSettingsDto } from './dto/update-settings.dto';

@Controller('users')
export class UsersController {
    constructor(private readonly usersService: UsersService) {}

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

    @Delete(':id')
    async remove(@Param('id', ParseIntPipe) id: number) {
        return await this.usersService.remove(id);
    }
}