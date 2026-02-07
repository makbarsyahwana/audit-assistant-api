import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RagClientService } from '../rag-client/rag-client.service';
import { CreateFindingDto } from './dto/create-finding.dto';
import { UpdateFindingDto } from './dto/update-finding.dto';

@Injectable()
export class FindingsService {
  private readonly logger = new Logger(FindingsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ragClient: RagClientService,
  ) {}

  async create(dto: CreateFindingDto, createdById?: string) {
    return this.prisma.finding.create({
      data: {
        engagementId: dto.engagementId,
        title: dto.title,
        criteria: dto.criteria,
        condition: dto.condition,
        cause: dto.cause,
        effect: dto.effect,
        recommendation: dto.recommendation,
        severity: dto.severity,
        citations: dto.citations as any,
        createdById,
      },
    });
  }

  async findAll(params: {
    engagementId?: string;
    status?: string;
    severity?: string;
    page?: number;
    limit?: number;
  }) {
    const { engagementId, status, severity, page = 1, limit = 20 } = params;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (engagementId) where.engagementId = engagementId;
    if (status) where.status = status;
    if (severity) where.severity = severity;

    const [data, total] = await Promise.all([
      this.prisma.finding.findMany({
        where,
        include: {
          createdBy: { select: { id: true, name: true, email: true } },
          engagement: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.finding.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const finding = await this.prisma.finding.findUnique({
      where: { id },
      include: {
        engagement: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });
    if (!finding) {
      throw new NotFoundException(`Finding ${id} not found`);
    }
    return finding;
  }

  async update(id: string, dto: UpdateFindingDto) {
    await this.findOne(id);
    return this.prisma.finding.update({
      where: { id },
      data: {
        ...dto,
        citations: dto.citations as any,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.finding.delete({ where: { id } });
    return { deleted: true };
  }

  async suggestCriteria(findingId: string) {
    const finding = await this.findOne(findingId);

    this.logger.log(`Suggesting criteria for finding ${findingId}`);

    const query = `Find the framework criteria and requirements related to: ${finding.title}`;

    const context = await this.ragClient.retrieve({
      query,
      engagementId: finding.engagementId,
      mode: 'hybrid',
      topK: 10,
    });

    const result = await this.ragClient.generate({
      query,
      context,
      systemPrompt: `You are an audit finding criteria assistant. Given the finding title and context, suggest the most relevant framework criteria (clause references, standard requirements) that apply. Format each criterion with its source reference using [CITE:chunk_id] format.`,
    });

    return {
      suggestedCriteria: result.answer,
      citations: result.citations,
      confidence: result.confidence,
    };
  }
}
