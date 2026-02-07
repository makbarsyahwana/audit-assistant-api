import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RagClientService } from '../rag-client/rag-client.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ragClient: RagClientService,
  ) {}

  async create(dto: CreateDocumentDto, uploadedById?: string) {
    return this.prisma.document.create({
      data: {
        engagementId: dto.engagementId,
        title: dto.title,
        docType: dto.docType,
        sourceSystem: dto.sourceSystem,
        sourceUri: dto.sourceUri,
        mimeType: dto.mimeType,
        sizeBytes: dto.sizeBytes,
        framework: dto.framework,
        clauseId: dto.clauseId,
        controlId: dto.controlId,
        entityId: dto.entityId,
        periodStart: dto.periodStart ? new Date(dto.periodStart) : undefined,
        periodEnd: dto.periodEnd ? new Date(dto.periodEnd) : undefined,
        confidentiality: dto.confidentiality,
        metadata: dto.metadata as any,
        uploadedById,
      },
    });
  }

  async findAll(params: {
    engagementId?: string;
    docType?: string;
    framework?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const { engagementId, docType, framework, search, page = 1, limit = 20 } = params;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (engagementId) where.engagementId = engagementId;
    if (docType) where.docType = docType;
    if (framework) where.framework = framework;
    if (search) {
      where.title = { contains: search, mode: 'insensitive' };
    }

    const [data, total] = await Promise.all([
      this.prisma.document.findMany({
        where,
        include: {
          uploadedBy: { select: { id: true, name: true, email: true } },
          engagement: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.document.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const doc = await this.prisma.document.findUnique({
      where: { id },
      include: {
        uploadedBy: { select: { id: true, name: true, email: true } },
        engagement: { select: { id: true, name: true } },
      },
    });
    if (!doc) {
      throw new NotFoundException(`Document ${id} not found`);
    }
    return doc;
  }

  async update(id: string, dto: UpdateDocumentDto) {
    await this.findOne(id);
    return this.prisma.document.update({
      where: { id },
      data: {
        ...dto,
        periodStart: dto.periodStart ? new Date(dto.periodStart) : undefined,
        periodEnd: dto.periodEnd ? new Date(dto.periodEnd) : undefined,
        metadata: dto.metadata as any,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.document.delete({ where: { id } });
    return { deleted: true };
  }
}
