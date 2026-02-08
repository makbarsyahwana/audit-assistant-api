import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ExportsService } from './exports.service';

@ApiTags('exports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('exports')
export class ExportsController {
  constructor(private readonly exportsService: ExportsService) {}

  // ------------------------------------------------------------------
  // Evidence Pack Exports
  // ------------------------------------------------------------------

  @Get('evidence-packs/:id')
  @ApiOperation({ summary: 'Export an evidence pack (PDF, ZIP, or JSON)' })
  @ApiQuery({ name: 'format', enum: ['pdf', 'zip', 'json'], required: false })
  async exportEvidencePack(
    @Param('id') id: string,
    @Query('format') format: 'pdf' | 'zip' | 'json' = 'json',
  ) {
    return this.exportsService.exportEvidencePack(id, format);
  }

  // ------------------------------------------------------------------
  // Traceability Matrix Exports
  // ------------------------------------------------------------------

  @Get('engagements/:engagementId/traceability-matrix')
  @ApiOperation({ summary: 'Export traceability matrix (Excel, CSV, or JSON)' })
  @ApiQuery({ name: 'format', enum: ['xlsx', 'csv', 'json'], required: false })
  async exportTraceabilityMatrix(
    @Param('engagementId') engagementId: string,
    @Query('format') format: 'xlsx' | 'csv' | 'json' = 'json',
  ) {
    return this.exportsService.exportTraceabilityMatrix(engagementId, format);
  }

  // ------------------------------------------------------------------
  // Workpaper Exports
  // ------------------------------------------------------------------

  @Get('workpapers/:id')
  @ApiOperation({ summary: 'Export a workpaper (Word, PDF, or JSON)' })
  @ApiQuery({ name: 'format', enum: ['docx', 'pdf', 'json'], required: false })
  async exportWorkpaper(
    @Param('id') id: string,
    @Query('format') format: 'docx' | 'pdf' | 'json' = 'json',
  ) {
    return this.exportsService.exportWorkpaper(id, format);
  }

  // ------------------------------------------------------------------
  // Engagement Bundle Export
  // ------------------------------------------------------------------

  @Get('engagements/:engagementId/bundle')
  @ApiOperation({ summary: 'Export full engagement bundle (all artifacts)' })
  async exportEngagementBundle(
    @Param('engagementId') engagementId: string,
  ) {
    return this.exportsService.exportEngagementBundle(engagementId);
  }
}
