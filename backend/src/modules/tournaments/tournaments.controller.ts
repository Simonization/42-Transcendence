import {
        Controller,
        Get,
        Post,
        Body,
        Patch,
        Param,
        Delete,
        ParseIntPipe,
        UseGuards,
        Request
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateTournamentDto } from './dto/create-tournament.dto';
import { UpdateTournamentDto } from './dto/update-tournament.dto';
import { TournamentsService } from './tournaments.service';

@Controller('tournaments')
export class TournamentsController {
    constructor(private readonly tournamentsService: TournamentsService) {}

    @Post()
    @UseGuards(JwtAuthGuard)
    create(@Body() createDto: CreateTournamentDto) {
        return this.tournamentsService.create(createDto);
    }

    @Get()
    findAll() {
        return this.tournamentsService.findAll();
    }

    @Post(':id/start')
    @UseGuards(JwtAuthGuard)
    start(@Param('id', ParseIntPipe) id: number) {
        return this.tournamentsService.start(id);
    }

    @Get(':id')
    findOne(@Param('id', ParseIntPipe) id: number) {
        return this.tournamentsService.findOne(id);
    }

    @Patch(':id')
    @UseGuards(JwtAuthGuard)
    update(@Param('id', ParseIntPipe) id: number, @Body() updateDto: UpdateTournamentDto) {
        return this.tournamentsService.update(id, updateDto);
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard)
    remove(@Param('id', ParseIntPipe) id: number) {
        return this.tournamentsService.remove(id);
    }

    @Post(':id/register')
    @UseGuards(JwtAuthGuard)
    register(
        @Request() req,
        @Param('id', ParseIntPipe) id: number,
        @Body() body: { teamName?: string; memberIds?: number[] },
    ) {
        return this.tournamentsService.register(req.user.sub, id, body.teamName, body.memberIds);
    }
}