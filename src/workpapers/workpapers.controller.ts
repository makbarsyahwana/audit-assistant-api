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
import { WorkpapersService } from './workpapers.service';
import { CreateWorkpaperDto } from './dto/create-workpaper.dto';
import { UpdateWorkpaperDto } from './dto/update-workpaper.dto';
import { GenerateDraftDto } from './dto/generate-draft.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('workpapers')
@Controller('workpapers')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class WorkpapersController {
  constructor(private readonly workpapersService: WorkpapersService) {}

  @Post()
  @ApiOperation({ summary: 'Create a workpaper' })
  create(@Body() dto: CreateWorkpaperDto, @Request() req: any) {
    return this.workpapersService.create(dto, req.user.id);
  }

  @Get()
  @ApiOperation({ summary: 'List workpapers' })
  @ApiQuery({ name: 'engagementId', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'templateType', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAll(
    @Query('engagementId') engagementId?: string,
    @Query('status') status?: string,
    @Query('templateType') templateType?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.workpapersService.findAll({
      engagementId,
      status,
      templateType,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get workpaper by ID' })
  findOne(@Param('id') id: string) {
    return this.workpapersService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update workpaper' })
  update(@Param('id') id: string, @Body() dto: UpdateWorkpaperDto) {
    return this.workpapersService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete workpaper' })
  remove(@Param('id') id: string) {
    return this.workpapersService.remove(id);
  }

  @Post('generate-draft')
  @ApiOperation({ summary: 'Generate workpaper draft using RAG engine' })
  generateDraft(@Body() dto: GenerateDraftDto) {
    return this.workpapersService.generateDraft(dto.workpaperId, dto.instructions);
  }
}
