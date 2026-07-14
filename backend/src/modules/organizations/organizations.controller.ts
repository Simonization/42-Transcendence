import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Body,
    Param,
    Query,
    ParseIntPipe,
    UseGuards,
    Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrganizationsService } from './organizations.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { AddMemberDto } from './dto/add-member.dto';

@Controller('organizations')
@UseGuards(JwtAuthGuard)
export class OrganizationsController {
    constructor(private readonly orgsService: OrganizationsService) {}

    @Get()
    async findAll(@Query('q') q?: string) {
        return this.orgsService.findAll(q);
    }

    @Get(':id')
    async findOne(@Param('id', ParseIntPipe) id: number) {
        return this.orgsService.findOne(id);
    }

    @Post()
    async create(@Request() req, @Body() dto: CreateOrganizationDto) {
        return this.orgsService.create(req.user.sub, dto);
    }

    @Patch(':id')
    async update(
        @Request() req,
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UpdateOrganizationDto,
    ) {
        return this.orgsService.update(req.user.sub, id, dto);
    }

    @Delete(':id')
    async remove(@Request() req, @Param('id', ParseIntPipe) id: number) {
        return this.orgsService.remove(req.user.sub, id);
    }

    @Get(':id/members')
    async getMembers(@Param('id', ParseIntPipe) id: number) {
        return this.orgsService.getMembers(id);
    }

    @Post(':id/members')
    async addMember(
        @Request() req,
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: AddMemberDto,
    ) {
        return this.orgsService.addMember(req.user.sub, id, dto);
    }

    @Delete(':id/members/:userId')
    async removeMember(
        @Request() req,
        @Param('id', ParseIntPipe) id: number,
        @Param('userId', ParseIntPipe) userId: number,
    ) {
        return this.orgsService.removeMember(req.user.sub, id, userId);
    }
}
