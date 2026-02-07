import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEvidencePackDto } from './dto/create-evidence-pack.dto';
import { UpdateEvidencePackDto } from './dto/update-evidence-pack.dto';
import { AddEvidenceItemDto } from './dto/add-evidence-item.dto';

@Injectable()
export class EvidencePacksService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateEvidencePackDto, createdById?: string) {
    return this.prisma.evidencePack.create({
      data: {
        engagementId: dto.engagementId,
        name: dto.name,
        description: dto.description,
        createdById,
      },
      include: { items: true },
    });
  }

  async findAll(params: {
    engagementId?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const { engagementId, status, page = 1, limit = 20 } = params;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (engagementId) where.engagementId = engagementId;
    if (status) where.status = status;

    const [data, total] = await Promise.all([
      this.prisma.evidencePack.findMany({
        where,
        include: {
          createdBy: { select: { id: true, name: true, email: true } },
          _count: { select: { items: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.evidencePack.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const pack = await this.prisma.evidencePack.findUnique({
      where: { id },
      include: {
        engagement: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        items: {
          include: {
            document: { select: { id: true, title: true, docType: true, mimeType: true } },
            control: { select: { id: true, controlId: true, title: true } },
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });
    if (!pack) {
      throw new NotFoundException(`Evidence pack ${id} not found`);
    }
    return pack;
  }

  async update(id: string, dto: UpdateEvidencePackDto) {
    await this.findOne(id);
    return this.prisma.evidencePack.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.evidencePack.delete({ where: { id } });
    return { deleted: true };
  }

  async addItem(packId: string, dto: AddEvidenceItemDto) {
    await this.findOne(packId);

    const existing = await this.prisma.evidencePackItem.findUnique({
      where: {
        evidencePackId_documentId: {
          evidencePackId: packId,
          documentId: dto.documentId,
        },
      },
    });
    if (existing) {
      throw new ConflictException('Document already in this evidence pack');
    }

    return this.prisma.evidencePackItem.create({
      data: {
        evidencePackId: packId,
        documentId: dto.documentId,
        controlId: dto.controlId,
        rationale: dto.rationale,
        sortOrder: dto.sortOrder || 0,
      },
      include: {
        document: { select: { id: true, title: true, docType: true } },
        control: { select: { id: true, controlId: true, title: true } },
      },
    });
  }

  async removeItem(packId: string, itemId: string) {
    const item = await this.prisma.evidencePackItem.findFirst({
      where: { id: itemId, evidencePackId: packId },
    });
    if (!item) {
      throw new NotFoundException('Evidence pack item not found');
    }

    await this.prisma.evidencePackItem.delete({ where: { id: itemId } });
    return { deleted: true };
  }

  async exportPack(id: string) {
    const pack = await this.findOne(id);

    return {
      packName: pack.name,
      description: pack.description,
      status: pack.status,
      engagement: pack.engagement,
      createdBy: pack.createdBy,
      createdAt: pack.createdAt,
      items: pack.items.map((item) => ({
        document: item.document,
        control: item.control,
        rationale: item.rationale,
      })),
      totalItems: pack.items.length,
    };
  }
}
