import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEngagementDto } from './dto/create-engagement.dto';
import { UpdateEngagementDto } from './dto/update-engagement.dto';
import { AddMemberDto } from './dto/add-member.dto';

@Injectable()
export class EngagementsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateEngagementDto) {
    return this.prisma.engagement.create({
      data: {
        name: dto.name,
        entityId: dto.entityId,
        status: dto.status,
      },
      include: { members: true },
    });
  }

  async findAll(userId?: string, userRole?: string) {
    // Admins see all engagements
    if (userRole === 'ADMIN') {
      return this.prisma.engagement.findMany({
        include: {
          members: {
            include: { user: { select: { id: true, name: true, email: true } } },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    // Others see only engagements they belong to
    return this.prisma.engagement.findMany({
      where: {
        members: { some: { userId } },
      },
      include: {
        members: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const engagement = await this.prisma.engagement.findUnique({
      where: { id },
      include: {
        members: {
          include: { user: { select: { id: true, name: true, email: true, role: true } } },
        },
      },
    });
    if (!engagement) {
      throw new NotFoundException(`Engagement ${id} not found`);
    }
    return engagement;
  }

  async update(id: string, dto: UpdateEngagementDto) {
    await this.findOne(id);
    return this.prisma.engagement.update({
      where: { id },
      data: dto,
      include: { members: true },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.engagement.delete({ where: { id } });
    return { deleted: true };
  }

  async addMember(engagementId: string, dto: AddMemberDto) {
    await this.findOne(engagementId);

    const existing = await this.prisma.engagementMember.findUnique({
      where: {
        userId_engagementId: {
          userId: dto.userId,
          engagementId,
        },
      },
    });
    if (existing) {
      throw new ConflictException('User is already a member of this engagement');
    }

    return this.prisma.engagementMember.create({
      data: {
        userId: dto.userId,
        engagementId,
        role: dto.role,
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });
  }

  async removeMember(engagementId: string, userId: string) {
    const membership = await this.prisma.engagementMember.findUnique({
      where: {
        userId_engagementId: { userId, engagementId },
      },
    });
    if (!membership) {
      throw new NotFoundException('Membership not found');
    }

    await this.prisma.engagementMember.delete({
      where: { id: membership.id },
    });
    return { deleted: true };
  }
}
