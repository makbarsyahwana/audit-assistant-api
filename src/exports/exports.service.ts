import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ExportsService {
  private readonly logger = new Logger(ExportsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ------------------------------------------------------------------
  // Evidence Pack Export (PDF + ZIP)
  // ------------------------------------------------------------------

  async exportEvidencePack(
    packId: string,
    format: 'pdf' | 'zip' | 'json' = 'json',
  ) {
    const pack = await this.prisma.evidencePack.findUnique({
      where: { id: packId },
      include: {
        engagement: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        items: {
          include: {
            document: true,
            control: { select: { id: true, controlId: true, title: true } },
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!pack) {
      throw new NotFoundException(`Evidence pack ${packId} not found`);
    }

    if (format === 'pdf') {
      return this.buildEvidencePackPdf(pack);
    }
    if (format === 'zip') {
      return this.buildEvidencePackZip(pack);
    }
    return this.buildEvidencePackJson(pack);
  }

  private buildEvidencePackJson(pack: any) {
    return {
      exportType: 'evidence_pack',
      exportedAt: new Date().toISOString(),
      pack: {
        id: pack.id,
        name: pack.name,
        description: pack.description,
        status: pack.status,
        engagement: pack.engagement,
        createdBy: pack.createdBy,
        createdAt: pack.createdAt,
        items: pack.items.map((item: any) => ({
          id: item.id,
          document: {
            id: item.document?.id,
            title: item.document?.title,
            docType: item.document?.docType,
            mimeType: item.document?.mimeType,
          },
          control: item.control,
          rationale: item.rationale,
          sortOrder: item.sortOrder,
        })),
        totalItems: pack.items.length,
      },
    };
  }

  private buildEvidencePackPdf(pack: any) {
    const sections = [
      {
        title: 'Evidence Pack Summary',
        content: [
          `Name: ${pack.name}`,
          `Description: ${pack.description || 'N/A'}`,
          `Status: ${pack.status}`,
          `Engagement: ${pack.engagement?.name || 'N/A'}`,
          `Created By: ${pack.createdBy?.name || 'N/A'}`,
          `Created At: ${pack.createdAt}`,
          `Total Items: ${pack.items.length}`,
        ],
      },
      {
        title: 'Evidence Items',
        content: pack.items.map((item: any, idx: number) => ({
          index: idx + 1,
          document: item.document?.title || 'Unknown',
          docType: item.document?.docType || 'N/A',
          control: item.control
            ? `${item.control.controlId}: ${item.control.title}`
            : 'N/A',
          rationale: item.rationale || 'N/A',
        })),
      },
    ];

    return {
      exportType: 'evidence_pack_pdf',
      format: 'pdf',
      filename: `evidence-pack-${pack.id}.pdf`,
      contentType: 'application/pdf',
      sections,
      metadata: {
        packId: pack.id,
        packName: pack.name,
        exportedAt: new Date().toISOString(),
      },
    };
  }

  private buildEvidencePackZip(pack: any) {
    const manifest = {
      packName: pack.name,
      files: pack.items.map((item: any, idx: number) => ({
        path: `${String(idx + 1).padStart(3, '0')}_${item.document?.title || 'unknown'}`,
        documentId: item.document?.id,
        mimeType: item.document?.mimeType,
        controlId: item.control?.controlId,
        rationale: item.rationale,
      })),
    };

    return {
      exportType: 'evidence_pack_zip',
      format: 'zip',
      filename: `evidence-pack-${pack.id}.zip`,
      contentType: 'application/zip',
      manifest,
      metadata: {
        packId: pack.id,
        packName: pack.name,
        totalFiles: pack.items.length,
        exportedAt: new Date().toISOString(),
      },
    };
  }

  // ------------------------------------------------------------------
  // Traceability Matrix Export (Excel)
  // ------------------------------------------------------------------

  async exportTraceabilityMatrix(
    engagementId: string,
    format: 'xlsx' | 'csv' | 'json' = 'json',
  ) {
    const [requirements, controls, mappings] = await Promise.all([
      this.prisma.requirement.findMany({
        where: { engagementId },
        orderBy: [{ framework: 'asc' }, { clauseId: 'asc' }],
      }),
      this.prisma.control.findMany({
        where: { engagementId },
        orderBy: { controlId: 'asc' },
      }),
      this.prisma.requirementControlMapping.findMany({
        where: { requirement: { engagementId } },
        include: {
          requirement: { select: { clauseId: true, title: true, framework: true } },
          control: { select: { controlId: true, title: true, status: true } },
        },
      }),
    ]);

    const mappingLookup = new Map<string, string>();
    for (const m of mappings) {
      mappingLookup.set(
        `${m.requirementId}:${m.controlId}`,
        m.coverageLevel,
      );
    }

    // Build matrix rows
    const matrixRows = requirements.map((req) => {
      const row: Record<string, any> = {
        framework: req.framework,
        clauseId: req.clauseId,
        requirement: req.title,
        priority: req.priority,
      };
      for (const ctrl of controls) {
        const key = `${req.id}:${ctrl.id}`;
        row[ctrl.controlId] = mappingLookup.get(key) || '';
      }
      return row;
    });

    // Coverage statistics
    const totalCells = requirements.length * controls.length;
    const coveredCells = mappings.filter((m) => m.coverageLevel !== 'NONE').length;
    const fullCoverage = mappings.filter((m) => m.coverageLevel === 'FULL').length;
    const gaps = requirements.filter(
      (req) =>
        !mappings.some(
          (m) => m.requirementId === req.id && m.coverageLevel !== 'NONE',
        ),
    );

    const stats = {
      requirementCount: requirements.length,
      controlCount: controls.length,
      mappingCount: mappings.length,
      coveragePercent:
        totalCells > 0 ? Math.round((coveredCells / totalCells) * 100) : 0,
      fullCoveragePercent:
        totalCells > 0 ? Math.round((fullCoverage / totalCells) * 100) : 0,
      gapCount: gaps.length,
      gaps: gaps.map((g) => ({
        clauseId: g.clauseId,
        title: g.title,
        framework: g.framework,
      })),
    };

    if (format === 'csv') {
      return this.buildMatrixCsv(matrixRows, controls);
    }

    if (format === 'xlsx') {
      return this.buildMatrixXlsx(matrixRows, controls, stats);
    }

    return {
      exportType: 'traceability_matrix',
      format: 'json',
      exportedAt: new Date().toISOString(),
      engagementId,
      matrix: matrixRows,
      stats,
    };
  }

  private buildMatrixCsv(
    rows: Record<string, any>[],
    controls: any[],
  ): string {
    if (rows.length === 0) return '';
    const headers = [
      'Framework',
      'Clause ID',
      'Requirement',
      'Priority',
      ...controls.map((c) => c.controlId),
    ];
    const csvRows = rows.map((row) =>
      [
        row.framework,
        row.clauseId,
        `"${(row.requirement || '').replace(/"/g, '""')}"`,
        row.priority,
        ...controls.map((c) => row[c.controlId] || ''),
      ].join(','),
    );
    return [headers.join(','), ...csvRows].join('\n');
  }

  private buildMatrixXlsx(
    rows: Record<string, any>[],
    controls: any[],
    stats: any,
  ) {
    // Returns structured data for xlsx generation
    // In production, use exceljs or xlsx library
    const headers = [
      'Framework',
      'Clause ID',
      'Requirement',
      'Priority',
      ...controls.map((c) => c.controlId),
    ];

    return {
      exportType: 'traceability_matrix_xlsx',
      format: 'xlsx',
      filename: `traceability-matrix.xlsx`,
      contentType:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      sheets: [
        {
          name: 'Traceability Matrix',
          headers,
          rows: rows.map((row) => [
            row.framework,
            row.clauseId,
            row.requirement,
            row.priority,
            ...controls.map((c) => row[c.controlId] || ''),
          ]),
        },
        {
          name: 'Coverage Summary',
          headers: ['Metric', 'Value'],
          rows: [
            ['Total Requirements', stats.requirementCount],
            ['Total Controls', stats.controlCount],
            ['Total Mappings', stats.mappingCount],
            ['Coverage %', `${stats.coveragePercent}%`],
            ['Full Coverage %', `${stats.fullCoveragePercent}%`],
            ['Gaps', stats.gapCount],
          ],
        },
        {
          name: 'Gaps',
          headers: ['Framework', 'Clause ID', 'Requirement'],
          rows: stats.gaps.map((g: any) => [g.framework, g.clauseId, g.title]),
        },
      ],
      metadata: { exportedAt: new Date().toISOString() },
    };
  }

  // ------------------------------------------------------------------
  // Workpaper Export (Word/PDF)
  // ------------------------------------------------------------------

  async exportWorkpaper(
    workpaperId: string,
    format: 'docx' | 'pdf' | 'json' = 'json',
  ) {
    const workpaper = await this.prisma.workpaper.findUnique({
      where: { id: workpaperId },
      include: {
        engagement: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });

    if (!workpaper) {
      throw new NotFoundException(`Workpaper ${workpaperId} not found`);
    }

    if (format === 'json') {
      return this.buildWorkpaperJson(workpaper);
    }

    if (format === 'docx') {
      return this.buildWorkpaperDocx(workpaper);
    }

    return this.buildWorkpaperPdf(workpaper);
  }

  private buildWorkpaperJson(wp: any) {
    return {
      exportType: 'workpaper',
      format: 'json',
      exportedAt: new Date().toISOString(),
      workpaper: {
        id: wp.id,
        title: wp.title,
        templateType: wp.templateType,
        status: wp.status,
        engagement: wp.engagement,
        createdBy: wp.createdBy,
        sections: wp.sections,
        conclusion: wp.conclusion,
        citations: wp.citations,
        createdAt: wp.createdAt,
        updatedAt: wp.updatedAt,
      },
    };
  }

  private buildWorkpaperDocx(wp: any) {
    // Returns structured data for docx generation
    // In production, use docx library (officegen or docx npm package)
    const sections = (wp.sections || []) as any[];

    return {
      exportType: 'workpaper_docx',
      format: 'docx',
      filename: `workpaper-${wp.id}.docx`,
      contentType:
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      document: {
        title: wp.title,
        subtitle: `${wp.templateType} — ${wp.engagement?.name || ''}`,
        metadata: {
          author: wp.createdBy?.name || 'Unknown',
          created: wp.createdAt,
          modified: wp.updatedAt,
          status: wp.status,
        },
        sections: sections.map((sec: any) => ({
          heading: sec.heading || sec.title,
          content: sec.content || sec.body || '',
          level: sec.level || 1,
        })),
        conclusion: wp.conclusion || '',
        citations: wp.citations || [],
      },
    };
  }

  private buildWorkpaperPdf(wp: any) {
    const sections = (wp.sections || []) as any[];

    return {
      exportType: 'workpaper_pdf',
      format: 'pdf',
      filename: `workpaper-${wp.id}.pdf`,
      contentType: 'application/pdf',
      document: {
        title: wp.title,
        subtitle: `${wp.templateType} — ${wp.engagement?.name || ''}`,
        author: wp.createdBy?.name || 'Unknown',
        status: wp.status,
        sections: sections.map((sec: any) => ({
          heading: sec.heading || sec.title,
          content: sec.content || sec.body || '',
        })),
        conclusion: wp.conclusion || '',
        citations: wp.citations || [],
      },
      metadata: { exportedAt: new Date().toISOString() },
    };
  }

  // ------------------------------------------------------------------
  // Bulk engagement export
  // ------------------------------------------------------------------

  async exportEngagementBundle(engagementId: string) {
    const engagement = await this.prisma.engagement.findUnique({
      where: { id: engagementId },
    });
    if (!engagement) {
      throw new NotFoundException(`Engagement ${engagementId} not found`);
    }

    const [packs, workpapers, findings] = await Promise.all([
      this.prisma.evidencePack.findMany({
        where: { engagementId },
        include: { items: { include: { document: true, control: true } } },
      }),
      this.prisma.workpaper.findMany({ where: { engagementId } }),
      this.prisma.finding.findMany({ where: { engagementId } }),
    ]);

    const matrix = await this.exportTraceabilityMatrix(engagementId, 'json');

    return {
      exportType: 'engagement_bundle',
      exportedAt: new Date().toISOString(),
      engagement: {
        id: engagement.id,
        name: engagement.name,
        status: engagement.status,
      },
      evidencePacks: packs.map((p) => this.buildEvidencePackJson(p)),
      workpapers: workpapers.map((w) => this.buildWorkpaperJson(w)),
      findings: findings.map((f) => ({
        id: f.id,
        title: f.title,
        severity: f.severity,
        status: f.status,
        criteria: f.criteria,
        condition: f.condition,
        cause: f.cause,
        effect: f.effect,
        recommendation: f.recommendation,
      })),
      traceabilityMatrix: matrix,
      summary: {
        evidencePackCount: packs.length,
        workpaperCount: workpapers.length,
        findingCount: findings.length,
      },
    };
  }
}
