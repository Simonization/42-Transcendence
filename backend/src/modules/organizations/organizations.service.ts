import {
    Injectable,
    NotFoundException,
    ForbiddenException,
    ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Organization } from './entities/organization.entity';
import { OrgMember } from './entities/org-member.entity';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { AddMemberDto } from './dto/add-member.dto';

@Injectable()
export class OrganizationsService {
    constructor(
        @InjectRepository(Organization)
        private readonly orgRepo: Repository<Organization>,
        @InjectRepository(OrgMember)
        private readonly memberRepo: Repository<OrgMember>,
    ) {}

    async findAll(q?: string): Promise<any[]> {
        const qb = this.orgRepo.createQueryBuilder('org')
            .leftJoinAndSelect('org.owner', 'owner')
            .loadRelationCountAndMap('org.memberCount', 'org.members');

        if (q) {
            qb.where('LOWER(org.name) LIKE :q', { q: `%${q.toLowerCase()}%` });
        }

        qb.orderBy('org.name', 'ASC');

        const orgs = await qb.getMany();

        return orgs.map(org => ({
            id: org.id,
            name: org.name,
            description: org.description,
            avatarUrl: org.avatarUrl,
            ownerId: org.ownerId,
            owner: org.owner ? { id: org.owner.id, username: org.owner.username } : undefined,
            memberCount: (org as any).memberCount ?? 0,
            createdAt: org.createdAt,
            updatedAt: org.updatedAt,
        }));
    }

    async findOne(id: number) {
        const org = await this.orgRepo.createQueryBuilder('org')
            .leftJoinAndSelect('org.owner', 'owner')
            .loadRelationCountAndMap('org.memberCount', 'org.members')
            .where('org.id = :id', { id })
            .getOne();

        if (!org) throw new NotFoundException('Organization not found');

        return {
            id: org.id,
            name: org.name,
            description: org.description,
            avatarUrl: org.avatarUrl,
            ownerId: org.ownerId,
            owner: org.owner ? { id: org.owner.id, username: org.owner.username } : undefined,
            memberCount: (org as any).memberCount ?? 0,
            createdAt: org.createdAt,
            updatedAt: org.updatedAt,
        };
    }

    async create(userId: number, dto: CreateOrganizationDto) {
        const existing = await this.orgRepo.findOne({ where: { name: dto.name } });
        if (existing) throw new ConflictException('Organization name already taken');

        const org = new Organization();
        org.name = dto.name;
        org.description = dto.description ?? null;
        org.ownerId = userId;
        const saved = await this.orgRepo.save(org);

        // Add owner as a member with 'owner' role
        const member = new OrgMember();
        member.userId = userId;
        member.orgId = saved.id;
        member.role = 'owner';
        await this.memberRepo.save(member);

        return this.findOne(saved.id);
    }

    async update(userId: number, orgId: number, dto: UpdateOrganizationDto) {
        const org = await this.orgRepo.findOne({ where: { id: orgId } });
        if (!org) throw new NotFoundException('Organization not found');

        await this.assertAdminOrOwner(userId, org);

        Object.assign(org, dto);
        await this.orgRepo.save(org);

        return this.findOne(orgId);
    }

    async remove(userId: number, orgId: number) {
        const org = await this.orgRepo.findOne({ where: { id: orgId } });
        if (!org) throw new NotFoundException('Organization not found');

        if (org.ownerId !== userId) {
            throw new ForbiddenException('Only the owner can delete this organization');
        }

        await this.orgRepo.remove(org);
    }

    async getMembers(orgId: number) {
        const org = await this.orgRepo.findOne({ where: { id: orgId } });
        if (!org) throw new NotFoundException('Organization not found');

        return this.memberRepo.find({
            where: { orgId },
            relations: ['user'],
            order: { joinedAt: 'ASC' },
        }).then(members => members.map(m => ({
            id: m.id,
            userId: m.userId,
            orgId: m.orgId,
            role: m.role,
            joinedAt: m.joinedAt,
            user: {
                id: m.user.id,
                username: m.user.username,
                avatarUrl: m.user.avatarUrl ?? null,
            },
        })));
    }

    async addMember(userId: number, orgId: number, dto: AddMemberDto) {
        const org = await this.orgRepo.findOne({ where: { id: orgId } });
        if (!org) throw new NotFoundException('Organization not found');

        await this.assertAdminOrOwner(userId, org);

        const existing = await this.memberRepo.findOne({
            where: { userId: dto.userId, orgId },
        });
        if (existing) throw new ConflictException('User is already a member');

        const member = new OrgMember();
        member.userId = dto.userId;
        member.orgId = orgId;
        member.role = dto.role ?? 'member';
        const saved = await this.memberRepo.save(member);

        const m = await this.memberRepo.findOne({
            where: { id: saved.id },
            relations: ['user'],
        });

        return {
            id: m!.id,
            userId: m!.userId,
            orgId: m!.orgId,
            role: m!.role,
            joinedAt: m!.joinedAt,
            user: {
                id: m!.user.id,
                username: m!.user.username,
                avatarUrl: m!.user.avatarUrl ?? null,
            },
        };
    }

    async removeMember(userId: number, orgId: number, targetUserId: number) {
        const org = await this.orgRepo.findOne({ where: { id: orgId } });
        if (!org) throw new NotFoundException('Organization not found');

        // Users can remove themselves, admins/owners can remove others
        if (targetUserId !== userId) {
            await this.assertAdminOrOwner(userId, org);
        }

        if (targetUserId === org.ownerId) {
            throw new ForbiddenException('Cannot remove the organization owner');
        }

        const member = await this.memberRepo.findOne({
            where: { userId: targetUserId, orgId },
        });
        if (!member) throw new NotFoundException('Member not found');

        await this.memberRepo.remove(member);
    }

    private async assertAdminOrOwner(userId: number, org: Organization) {
        if (org.ownerId === userId) return;

        const member = await this.memberRepo.findOne({
            where: { userId, orgId: org.id },
        });

        if (!member || (member.role !== 'admin' && member.role !== 'owner')) {
            throw new ForbiddenException('Insufficient permissions');
        }
    }
}
