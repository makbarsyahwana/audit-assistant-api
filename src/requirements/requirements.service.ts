import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRequirementDto } from './dto/create-requirement.dto';
import { UpdateRequirementDto } from './dto/update-requirement.dto';

@Injectable()
export class RequirementsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateRequirementDto) {
    return this.prisma.requirement.create({
      data: dto,
      include: { controlMappings: true },
    });
  }

  async findAll(params: {
    engagementId?: string;
    framework?: string;
    category?: string;
    page?: number;
    limit?: number;
  }) {
    const { engagementId, framework, category, page = 1, limit = 50 } = params;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (engagementId) where.engagementId = engagementId;
    if (framework) where.framework = framework;
    if (category) where.category = category;

    const [data, total] = await Promise.all([
      this.prisma.requirement.findMany({
        where,
        include: {
          controlMappings: {
            include: { control: { select: { id: true, controlId: true, title: true, status: true } } },
          },
        },
        orderBy: [{ framework: 'asc' }, { clauseId: 'asc' }],
        skip,
        take: limit,
      }),
      this.prisma.requirement.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const req = await this.prisma.requirement.findUnique({
      where: { id },
      include: {
        engagement: { select: { id: true, name: true } },
        controlMappings: {
          include: { control: true },
        },
      },
    });
    if (!req) {
      throw new NotFoundException(`Requirement ${id} not found`);
    }
    return req;
  }

  async update(id: string, dto: UpdateRequirementDto) {
    await this.findOne(id);
    return this.prisma.requirement.update({
      where: { id },
      data: dto,
      include: { controlMappings: true },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.requirement.delete({ where: { id } });
    return { deleted: true };
  }
}
