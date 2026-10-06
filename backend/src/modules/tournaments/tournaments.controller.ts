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
        UseGuards,
        Req
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { OptionalUserGuard } from '../auth/guards/optional-user.guard';
import { ADMIN_ROLE, SUPER_ADMIN_ROLE } from '../users/constants/user-roles';
import { CreateTournamentDto } from './dto/create-tournament.dto';
import { UpdateTournamentDto } from './dto/update-tournament.dto';
import { SetSeedingDto } from './dto/set-seeding.dto';
import { TournamentsService } from './tournaments.service';

/** DRAFT tournaments are an admin's work in progress: only admins see them on the read routes. */
const viewerIsAdmin = (req: { user?: { role?: number } | null }) =>
    req.user?.role === ADMIN_ROLE || req.user?.role === SUPER_ADMIN_ROLE;

@Controller('tournaments')
export class TournamentsController {
    constructor(private readonly tournamentsService: TournamentsService) {}

    @Post()
    @UseGuards(JwtAuthGuard, AdminGuard)
    create(@Body() createDto: CreateTournamentDto) {
        return this.tournamentsService.create(createDto);
    }

    @Get()
    @UseGuards(OptionalUserGuard)
    findAll(@Req() req) {
        return this.tournamentsService.findAll(viewerIsAdmin(req));
    }

    /** Freezes the field and generates phase 1's matches. */
    @Post(':id/start')
    @UseGuards(JwtAuthGuard, AdminGuard)
    start(@Param('id', ParseIntPipe) id: number) {
        return this.tournamentsService.start(id);
    }

    /** The teams that would enter (or entered), seed 1 first, with the first-round layout. */
    @Get(':id/seeding')
    @UseGuards(OptionalUserGuard)
    getSeeding(@Param('id', ParseIntPipe) id: number, @Req() req) {
        return this.tournamentsService.getSeeding(id, viewerIsAdmin(req));
    }

    /** Check-in state and who would be archived if the tournament started now. */
    @Get(':id/checkin')
    @UseGuards(OptionalUserGuard)
    getCheckin(@Param('id', ParseIntPipe) id: number, @Req() req) {
        return this.tournamentsService.getCheckin(id, viewerIsAdmin(req));
    }

    /** Sets the seed order. Before start only. */
    @Put(':id/seeding')
    @UseGuards(JwtAuthGuard, AdminGuard)
    setSeeding(@Param('id', ParseIntPipe) id: number, @Body() dto: SetSeedingDto) {
        return this.tournamentsService.setSeeding(id, dto.teamIds);
    }

    /** Group / round-robin standings for every such phase that has matches. */
    @Get(':id/standings')
    @UseGuards(OptionalUserGuard)
    getStandings(@Param('id', ParseIntPipe) id: number, @Req() req) {
        return this.tournamentsService.getStandings(id, viewerIsAdmin(req));
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
    @UseGuards(OptionalUserGuard)
    findOne(@Param('id', ParseIntPipe) id: number, @Req() req) {
        return this.tournamentsService.findOne(id, viewerIsAdmin(req));
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
