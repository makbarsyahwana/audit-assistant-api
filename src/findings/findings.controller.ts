import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { FindingsService } from './findings.service';
import { CreateFindingDto } from './dto/create-finding.dto';
import { UpdateFindingDto } from './dto/update-finding.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('findings')
@Controller('findings')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class FindingsController {
  constructor(private readonly findingsService: FindingsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a finding' })
  create(@Body() dto: CreateFindingDto, @Request() req: any) {
    return this.findingsService.create(dto, req.user.id);
  }

  @Get()
  @ApiOperation({ summary: 'List findings' })
  @ApiQuery({ name: 'engagementId', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'severity', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAll(
    @Query('engagementId') engagementId?: string,
    @Query('status') status?: string,
    @Query('severity') severity?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.findingsService.findAll({
      engagementId,
      status,
      severity,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get finding by ID' })
  findOne(@Param('id') id: string) {
    return this.findingsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a finding' })
  update(@Param('id') id: string, @Body() dto: UpdateFindingDto) {
    return this.findingsService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a finding' })
  remove(@Param('id') id: string) {
    return this.findingsService.remove(id);
  }

  @Post(':id/suggest-criteria')
  @ApiOperation({ summary: 'Auto-suggest criteria from framework text using RAG' })
  suggestCriteria(@Param('id') id: string) {
    return this.findingsService.suggestCriteria(id);
  }
}
