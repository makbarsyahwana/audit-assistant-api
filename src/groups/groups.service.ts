import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { AddGroupMemberDto } from './dto/add-group-member.dto';

@Injectable()
export class GroupsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateGroupDto) {
    const existing = await this.prisma.group.findUnique({
      where: { name: dto.name },
    });
    if (existing) {
      throw new ConflictException(`Group "${dto.name}" already exists`);
    }

    return this.prisma.group.create({
      data: {
        name: dto.name,
        description: dto.description,
        externalId: dto.externalId,
        source: dto.source,
      },
      include: { members: { include: { user: { select: { id: true, name: true, email: true } } } } },
    });
  }

  async findAll(search?: string) {
    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { description: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    return this.prisma.group.findMany({
      where,
      include: {
        members: {
          include: {
            user: { select: { id: true, name: true, email: true, role: true } },
          },
        },
        _count: { select: { members: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const group = await this.prisma.group.findUnique({
      where: { id },
      include: {
        members: {
          include: {
            user: { select: { id: true, name: true, email: true, role: true } },
          },
        },
      },
    });
    if (!group) {
      throw new NotFoundException(`Group ${id} not found`);
    }
    return group;
  }

  async update(id: string, dto: UpdateGroupDto) {
    await this.findOne(id);
    return this.prisma.group.update({
      where: { id },
      data: dto,
      include: {
        members: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.group.delete({ where: { id } });
    return { deleted: true };
  }

  async addMember(groupId: string, dto: AddGroupMemberDto) {
    await this.findOne(groupId);

    const existing = await this.prisma.groupMember.findUnique({
      where: {
        userId_groupId: { userId: dto.userId, groupId },
      },
    });
    if (existing) {
      throw new ConflictException('User is already a member of this group');
    }

    return this.prisma.groupMember.create({
      data: {
        userId: dto.userId,
        groupId,
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        group: { select: { id: true, name: true } },
      },
    });
  }

  async removeMember(groupId: string, userId: string) {
    const membership = await this.prisma.groupMember.findUnique({
      where: {
        userId_groupId: { userId, groupId },
      },
    });
    if (!membership) {
      throw new NotFoundException('Group membership not found');
    }

    await this.prisma.groupMember.delete({
      where: { id: membership.id },
    });
    return { deleted: true };
  }

  async syncFromIdp(
    externalGroups: Array<{ externalId: string; name: string; source: string }>,
  ) {
    const results = { created: 0, updated: 0, unchanged: 0 };

    for (const eg of externalGroups) {
      const existing = await this.prisma.group.findFirst({
        where: { externalId: eg.externalId },
      });

      if (!existing) {
        await this.prisma.group.create({
          data: {
            name: eg.name,
            externalId: eg.externalId,
            source: eg.source as any,
          },
        });
        results.created++;
      } else if (existing.name !== eg.name) {
        await this.prisma.group.update({
          where: { id: existing.id },
          data: { name: eg.name },
        });
        results.updated++;
      } else {
        results.unchanged++;
      }
    }

    return results;
  }
}
