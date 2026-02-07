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
import { EvidencePacksService } from './evidence-packs.service';
import { CreateEvidencePackDto } from './dto/create-evidence-pack.dto';
import { UpdateEvidencePackDto } from './dto/update-evidence-pack.dto';
import { AddEvidenceItemDto } from './dto/add-evidence-item.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('evidence-packs')
@Controller('evidence-packs')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class EvidencePacksController {
  constructor(private readonly evidencePacksService: EvidencePacksService) {}

  @Post()
  @ApiOperation({ summary: 'Create an evidence pack' })
  create(@Body() dto: CreateEvidencePackDto, @Request() req: any) {
    return this.evidencePacksService.create(dto, req.user.id);
  }

  @Get()
  @ApiOperation({ summary: 'List evidence packs' })
  @ApiQuery({ name: 'engagementId', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAll(
    @Query('engagementId') engagementId?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.evidencePacksService.findAll({
      engagementId,
      status,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get evidence pack with items' })
  findOne(@Param('id') id: string) {
    return this.evidencePacksService.findOne(id);
  }

  @Get(':id/export')
  @ApiOperation({ summary: 'Export evidence pack metadata' })
  exportPack(@Param('id') id: string) {
    return this.evidencePacksService.exportPack(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update evidence pack' })
  update(@Param('id') id: string, @Body() dto: UpdateEvidencePackDto) {
    return this.evidencePacksService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete evidence pack' })
  remove(@Param('id') id: string) {
    return this.evidencePacksService.remove(id);
  }

  @Post(':id/items')
  @ApiOperation({ summary: 'Add document to evidence pack' })
  addItem(@Param('id') id: string, @Body() dto: AddEvidenceItemDto) {
    return this.evidencePacksService.addItem(id, dto);
  }

  @Delete(':id/items/:itemId')
  @ApiOperation({ summary: 'Remove item from evidence pack' })
  removeItem(@Param('id') id: string, @Param('itemId') itemId: string) {
    return this.evidencePacksService.removeItem(id, itemId);
  }
}
