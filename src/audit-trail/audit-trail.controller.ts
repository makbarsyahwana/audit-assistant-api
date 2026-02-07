import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  Res,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Response } from 'express';
import { Role } from '@prisma/client';
import { AuditTrailService } from './audit-trail.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('audit-trail')
@Controller('audit-trail')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AuditTrailController {
  constructor(private readonly auditTrailService: AuditTrailService) {}

  @Get('queries')
  @Roles(Role.ADMIN, Role.AUDIT_MANAGER, Role.AUDITOR)
  @ApiOperation({ summary: 'List query logs (paginated)' })
  @ApiQuery({ name: 'engagementId', required: false })
  @ApiQuery({ name: 'userId', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findQueries(
    @Query('engagementId') engagementId?: string,
    @Query('userId') userId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.auditTrailService.findQueries({
      engagementId,
      userId,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  @Get('queries/:id')
  @Roles(Role.ADMIN, Role.AUDIT_MANAGER, Role.AUDITOR)
  @ApiOperation({ summary: 'Get query log detail with retrieval events' })
  findQueryById(@Param('id') id: string) {
    return this.auditTrailService.findQueryById(id);
  }

  @Get('export')
  @Roles(Role.ADMIN, Role.AUDIT_MANAGER)
  @ApiOperation({ summary: 'Export audit trail to CSV or JSON' })
  @ApiQuery({ name: 'engagementId', required: false })
  @ApiQuery({ name: 'format', required: false, enum: ['json', 'csv'] })
  async exportQueries(
    @Query('engagementId') engagementId?: string,
    @Query('format') format?: 'json' | 'csv',
    @Res() res?: Response,
  ) {
    const result = await this.auditTrailService.exportQueries({
      engagementId,
      format: format || 'json',
    });

    if (format === 'csv' && res) {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader(
        'Content-Disposition',
        'attachment; filename=audit-trail.csv',
      );
      res.send(result);
      return;
    }

    if (res) {
      res.json(result);
    }
  }
}
