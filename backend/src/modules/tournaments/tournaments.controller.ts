import {
        Controller,
        Get,
        Post,
        Put,
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
import { SetSeedingDto } from './dto/set-seeding.dto';
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

    /** The teams that would enter (or entered), seed 1 first, with the first-round layout. */
    @Get(':id/seeding')
    getSeeding(@Param('id', ParseIntPipe) id: number) {
        return this.tournamentsService.getSeeding(id);
    }

    /** Check-in state and who would be archived if the tournament started now. */
    @Get(':id/checkin')
    getCheckin(@Param('id', ParseIntPipe) id: number) {
        return this.tournamentsService.getCheckin(id);
    }

    /** Sets the seed order. Before start only. */
    @Put(':id/seeding')
    @UseGuards(JwtAuthGuard, AdminGuard)
    setSeeding(@Param('id', ParseIntPipe) id: number, @Body() dto: SetSeedingDto) {
        return this.tournamentsService.setSeeding(id, dto.teamIds);
    }

    /** Group / round-robin standings for every such phase that has matches. */
    @Get(':id/standings')
    getStandings(@Param('id', ParseIntPipe) id: number) {
        return this.tournamentsService.getStandings(id);
    }

    /** The team forfeits its remaining match(es) in the active phase: walkover to the opponent. */
    @Post(':id/teams/:teamId/withdraw')
    @UseGuards(JwtAuthGuard, AdminGuard)
    withdraw(
        @Param('id', ParseIntPipe) id: number,
        @Param('teamId', ParseIntPipe) teamId: number,
    ) {
        return this.tournamentsService.withdrawTeam(id, teamId);
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
