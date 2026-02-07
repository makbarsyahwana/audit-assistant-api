import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateControlDto } from './dto/create-control.dto';
import { UpdateControlDto } from './dto/update-control.dto';

@Injectable()
export class ControlsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateControlDto) {
    return this.prisma.control.create({
      data: {
        engagementId: dto.engagementId,
        controlId: dto.controlId,
        title: dto.title,
        description: dto.description,
        owner: dto.owner,
        frequency: dto.frequency,
        controlType: dto.controlType,
      },
    });
  }

  async findAll(params: {
    engagementId?: string;
    status?: string;
    controlType?: string;
    page?: number;
    limit?: number;
  }) {
    const { engagementId, status, controlType, page = 1, limit = 50 } = params;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (engagementId) where.engagementId = engagementId;
    if (status) where.status = status;
    if (controlType) where.controlType = controlType;

    const [data, total] = await Promise.all([
      this.prisma.control.findMany({
        where,
        include: {
          requirementMappings: {
            include: { requirement: { select: { id: true, clauseId: true, title: true, framework: true } } },
          },
        },
        orderBy: { controlId: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.control.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const control = await this.prisma.control.findUnique({
      where: { id },
      include: {
        engagement: { select: { id: true, name: true } },
        requirementMappings: {
          include: { requirement: true },
        },
        evidencePackItems: {
          include: { document: { select: { id: true, title: true, docType: true } } },
        },
      },
    });
    if (!control) {
      throw new NotFoundException(`Control ${id} not found`);
    }
    return control;
  }

  async update(id: string, dto: UpdateControlDto) {
    await this.findOne(id);
    return this.prisma.control.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.control.delete({ where: { id } });
    return { deleted: true };
  }
}
