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
import { RequirementsService } from './requirements.service';
import { CreateRequirementDto } from './dto/create-requirement.dto';
import { UpdateRequirementDto } from './dto/update-requirement.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('requirements')
@Controller('requirements')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class RequirementsController {
  constructor(private readonly requirementsService: RequirementsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a requirement' })
  create(@Body() dto: CreateRequirementDto) {
    return this.requirementsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List requirements with filters' })
  @ApiQuery({ name: 'engagementId', required: false })
  @ApiQuery({ name: 'framework', required: false })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAll(
    @Query('engagementId') engagementId?: string,
    @Query('framework') framework?: string,
    @Query('category') category?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.requirementsService.findAll({
      engagementId,
      framework,
      category,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 50,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get requirement by ID with control mappings' })
  findOne(@Param('id') id: string) {
    return this.requirementsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a requirement' })
  update(@Param('id') id: string, @Body() dto: UpdateRequirementDto) {
    return this.requirementsService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a requirement' })
  remove(@Param('id') id: string) {
    return this.requirementsService.remove(id);
  }
}
