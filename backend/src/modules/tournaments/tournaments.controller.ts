import {
        Controller,
        Get,
        Post,
        Body,
        Patch,
        Param,
        Delete,
        ParseIntPipe,
        UseGuards
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { CreateTournamentDto } from './dto/create-tournament.dto';
import { UpdateTournamentDto } from './dto/update-tournament.dto';
import { TournamentsService } from './tournaments.service';

@Controller('tournaments')
export class TournamentsController {
    constructor(private readonly tournamentsService: TournamentsService) {}

    @Post()
    @UseGuards(JwtAuthGuard, AdminGuard)
    create(@Body() createDto: CreateTournamentDto) {
        return this.tournamentsService.create(createDto);
    }

    @Get()
    findAll() {
        return this.tournamentsService.findAll();
    }

    /** Freezes the field and generates phase 1's matches. */
    @Post(':id/start')
    @UseGuards(JwtAuthGuard, AdminGuard)
    start(@Param('id', ParseIntPipe) id: number) {
        return this.tournamentsService.start(id);
    }

    @Get(':id')
    findOne(@Param('id', ParseIntPipe) id: number) {
        return this.tournamentsService.findOne(id);
    }

    @Patch(':id')
    @UseGuards(JwtAuthGuard, AdminGuard)
    update(@Param('id', ParseIntPipe) id: number, @Body() updateDto: UpdateTournamentDto) {
        return this.tournamentsService.update(id, updateDto);
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard, AdminGuard)
    remove(@Param('id', ParseIntPipe) id: number) {
        return this.tournamentsService.remove(id);
    }
}