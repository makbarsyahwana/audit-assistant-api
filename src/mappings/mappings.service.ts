import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMappingDto } from './dto/create-mapping.dto';
import { UpdateMappingDto } from './dto/update-mapping.dto';

@Injectable()
export class MappingsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateMappingDto) {
    const existing = await this.prisma.requirementControlMapping.findUnique({
      where: {
        requirementId_controlId: {
          requirementId: dto.requirementId,
          controlId: dto.controlId,
        },
      },
    });
    if (existing) {
      throw new ConflictException('This mapping already exists');
    }

    return this.prisma.requirementControlMapping.create({
      data: dto,
      include: {
        requirement: { select: { id: true, clauseId: true, title: true, framework: true } },
        control: { select: { id: true, controlId: true, title: true, status: true } },
      },
    });
  }

  async findAll(params: { engagementId?: string }) {
    const { engagementId } = params;

    const where: Record<string, unknown> = {};
    if (engagementId) {
      where.requirement = { engagementId };
    }

    return this.prisma.requirementControlMapping.findMany({
      where,
      include: {
        requirement: { select: { id: true, clauseId: true, title: true, framework: true, priority: true } },
        control: { select: { id: true, controlId: true, title: true, status: true, controlType: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getMatrix(engagementId: string) {
    const [requirements, controls, mappings] = await Promise.all([
      this.prisma.requirement.findMany({
        where: { engagementId },
        orderBy: [{ framework: 'asc' }, { clauseId: 'asc' }],
        select: { id: true, framework: true, clauseId: true, title: true, priority: true },
      }),
      this.prisma.control.findMany({
        where: { engagementId },
        orderBy: { controlId: 'asc' },
        select: { id: true, controlId: true, title: true, status: true },
      }),
      this.prisma.requirementControlMapping.findMany({
        where: { requirement: { engagementId } },
        select: { requirementId: true, controlId: true, coverageLevel: true },
      }),
    ]);

    // Build coverage matrix
    const mappingMap = new Map<string, string>();
    for (const m of mappings) {
      mappingMap.set(`${m.requirementId}:${m.controlId}`, m.coverageLevel);
    }

    const matrix = requirements.map((req) => ({
      requirement: req,
      controls: controls.map((ctrl) => ({
        control: ctrl,
        coverage: mappingMap.get(`${req.id}:${ctrl.id}`) || null,
      })),
    }));

    // Calculate coverage stats
    const totalCells = requirements.length * controls.length;
    const coveredCells = mappings.filter((m) => m.coverageLevel !== 'NONE').length;
    const fullCoverage = mappings.filter((m) => m.coverageLevel === 'FULL').length;

    return {
      matrix,
      stats: {
        requirementCount: requirements.length,
        controlCount: controls.length,
        mappingCount: mappings.length,
        coveragePercent: totalCells > 0 ? Math.round((coveredCells / totalCells) * 100) : 0,
        fullCoveragePercent: totalCells > 0 ? Math.round((fullCoverage / totalCells) * 100) : 0,
        gaps: requirements
          .filter((req) => !mappings.some((m) => m.requirementId === req.id && m.coverageLevel !== 'NONE'))
          .map((req) => ({ requirementId: req.id, clauseId: req.clauseId, title: req.title })),
      },
    };
  }

  async findOne(id: string) {
    const mapping = await this.prisma.requirementControlMapping.findUnique({
      where: { id },
      include: {
        requirement: true,
        control: true,
      },
    });
    if (!mapping) {
      throw new NotFoundException(`Mapping ${id} not found`);
    }
    return mapping;
  }

  async update(id: string, dto: UpdateMappingDto) {
    await this.findOne(id);
    return this.prisma.requirementControlMapping.update({
      where: { id },
      data: dto,
      include: {
        requirement: { select: { id: true, clauseId: true, title: true } },
        control: { select: { id: true, controlId: true, title: true } },
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.requirementControlMapping.delete({ where: { id } });
    return { deleted: true };
  }

  async exportMatrix(engagementId: string, format: 'json' | 'csv' = 'json') {
    const result = await this.getMatrix(engagementId);

    if (format === 'csv') {
      const controls = result.matrix[0]?.controls.map((c) => c.control.controlId) || [];
      const headers = ['Framework', 'Clause ID', 'Requirement', ...controls];

      const rows = result.matrix.map((row) => [
        row.requirement.framework,
        row.requirement.clauseId,
        `"${row.requirement.title.replace(/"/g, '""')}"`,
        ...row.controls.map((c) => c.coverage || ''),
      ]);

      return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    }

    return result;
  }
}
