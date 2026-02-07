import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RagClientService } from '../rag-client/rag-client.service';
import { CreateWorkpaperDto } from './dto/create-workpaper.dto';
import { UpdateWorkpaperDto } from './dto/update-workpaper.dto';

@Injectable()
export class WorkpapersService {
  private readonly logger = new Logger(WorkpapersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ragClient: RagClientService,
  ) {}

  async create(dto: CreateWorkpaperDto, createdById?: string) {
    return this.prisma.workpaper.create({
      data: {
        engagementId: dto.engagementId,
        title: dto.title,
        templateType: dto.templateType,
        criteria: dto.criteria,
        condition: dto.condition,
        testing: dto.testing,
        result: dto.result,
        conclusion: dto.conclusion,
        createdById,
      },
    });
  }

  async findAll(params: {
    engagementId?: string;
    status?: string;
    templateType?: string;
    page?: number;
    limit?: number;
  }) {
    const { engagementId, status, templateType, page = 1, limit = 20 } = params;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (engagementId) where.engagementId = engagementId;
    if (status) where.status = status;
    if (templateType) where.templateType = templateType;

    const [data, total] = await Promise.all([
      this.prisma.workpaper.findMany({
        where,
        include: {
          createdBy: { select: { id: true, name: true, email: true } },
          engagement: { select: { id: true, name: true } },
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.workpaper.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const wp = await this.prisma.workpaper.findUnique({
      where: { id },
      include: {
        engagement: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });
    if (!wp) {
      throw new NotFoundException(`Workpaper ${id} not found`);
    }
    return wp;
  }

  async update(id: string, dto: UpdateWorkpaperDto) {
    await this.findOne(id);
    return this.prisma.workpaper.update({
      where: { id },
      data: {
        ...dto,
        citations: dto.citations as any,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.workpaper.delete({ where: { id } });
    return { deleted: true };
  }

  async generateDraft(workpaperId: string, instructions?: string) {
    const wp = await this.findOne(workpaperId);

    this.logger.log(`Generating draft for workpaper ${workpaperId}`);

    // Build the query for the RAG engine based on workpaper context
    const queryParts = [`Draft a workpaper for: ${wp.title}`];
    if (wp.criteria) queryParts.push(`Criteria: ${wp.criteria}`);
    if (instructions) queryParts.push(`Instructions: ${instructions}`);

    const query = queryParts.join('\n');

    // Retrieve relevant context
    const context = await this.ragClient.retrieve({
      query,
      engagementId: wp.engagementId,
      mode: 'hybrid',
      topK: 15,
    });

    // Generate draft using RAG engine
    const result = await this.ragClient.generate({
      query,
      context,
      systemPrompt: this.getWorkpaperSystemPrompt(wp.templateType),
    });

    // Update workpaper with draft
    const updated = await this.prisma.workpaper.update({
      where: { id: workpaperId },
      data: {
        draftContent: result.answer,
        citations: result.citations as any,
      },
    });

    return {
      workpaper: updated,
      citations: result.citations,
      confidence: result.confidence,
    };
  }

  private getWorkpaperSystemPrompt(templateType: string): string {
    switch (templateType) {
      case 'CRITERIA_CONDITION':
        return `You are an audit workpaper drafting assistant. Structure the workpaper with these sections:
1. Criteria: The standard, policy, or requirement being evaluated
2. Condition: The current state observed during testing
3. Testing: Procedures performed and samples selected
4. Result: Findings from the testing procedures
5. Conclusion: Overall assessment of control effectiveness
Include citations from the provided evidence using [CITE:chunk_id] format.`;

      case 'FINANCIAL_MEMO':
        return `You are an audit memo drafting assistant for financial audits. Structure the memo with:
1. Objective
2. Scope and methodology
3. Key observations with paragraph citations
4. Conclusion and recommendations
Include citations using [CITE:chunk_id] format.`;

      case 'WALKTHROUGH':
        return `You are an audit workpaper drafting assistant for control walkthroughs. Structure with:
1. Process description
2. Key controls identified
3. Walkthrough steps performed
4. Control design assessment
Include citations using [CITE:chunk_id] format.`;

      default:
        return `You are an audit workpaper drafting assistant. Draft a comprehensive workpaper based on the provided context and evidence. Include citations using [CITE:chunk_id] format.`;
    }
  }
}
