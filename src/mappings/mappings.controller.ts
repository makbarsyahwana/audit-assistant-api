import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Response } from 'express';
import { MappingsService } from './mappings.service';
import { CreateMappingDto } from './dto/create-mapping.dto';
import { UpdateMappingDto } from './dto/update-mapping.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('requirement-control-mappings')
@Controller('mappings')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MappingsController {
  constructor(private readonly mappingsService: MappingsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a requirement-control mapping' })
  create(@Body() dto: CreateMappingDto) {
    return this.mappingsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all mappings' })
  @ApiQuery({ name: 'engagementId', required: false })
  findAll(@Query('engagementId') engagementId?: string) {
    return this.mappingsService.findAll({ engagementId });
  }

  @Get('matrix/:engagementId')
  @ApiOperation({ summary: 'Get traceability matrix for an engagement' })
  getMatrix(@Param('engagementId') engagementId: string) {
    return this.mappingsService.getMatrix(engagementId);
  }

  @Get('matrix/:engagementId/export')
  @ApiOperation({ summary: 'Export traceability matrix as CSV or JSON' })
  @ApiQuery({ name: 'format', required: false, enum: ['json', 'csv'] })
  async exportMatrix(
    @Param('engagementId') engagementId: string,
    @Query('format') format?: 'json' | 'csv',
    @Res() res?: Response,
  ) {
    const result = await this.mappingsService.exportMatrix(
      engagementId,
      format || 'json',
    );

    if (format === 'csv' && res) {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader(
        'Content-Disposition',
        'attachment; filename=traceability-matrix.csv',
      );
      res.send(result);
      return;
    }

    if (res) {
      res.json(result);
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get mapping by ID' })
  findOne(@Param('id') id: string) {
    return this.mappingsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a mapping' })
  update(@Param('id') id: string, @Body() dto: UpdateMappingDto) {
    return this.mappingsService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a mapping' })
  remove(@Param('id') id: string) {
    return this.mappingsService.remove(id);
  }
}
