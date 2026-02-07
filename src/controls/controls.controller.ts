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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ControlsService } from './controls.service';
import { CreateControlDto } from './dto/create-control.dto';
import { UpdateControlDto } from './dto/update-control.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('controls')
@Controller('controls')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ControlsController {
  constructor(private readonly controlsService: ControlsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a control' })
  create(@Body() dto: CreateControlDto) {
    return this.controlsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List controls with filters' })
  @ApiQuery({ name: 'engagementId', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'controlType', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAll(
    @Query('engagementId') engagementId?: string,
    @Query('status') status?: string,
    @Query('controlType') controlType?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.controlsService.findAll({
      engagementId,
      status,
      controlType,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 50,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get control by ID with mappings and evidence' })
  findOne(@Param('id') id: string) {
    return this.controlsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a control' })
  update(@Param('id') id: string, @Body() dto: UpdateControlDto) {
    return this.controlsService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a control' })
  remove(@Param('id') id: string) {
    return this.controlsService.remove(id);
  }
}
