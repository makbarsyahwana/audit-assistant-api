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
import { CorpusScope } from '@prisma/client';
import { DocumentsService } from './documents.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('documents')
@Controller('documents')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post()
  @ApiOperation({ summary: 'Register a new document' })
  create(@Body() dto: CreateDocumentDto, @Request() req: any) {
    return this.documentsService.create(dto, req.user.id);
  }

  @Get()
  @ApiOperation({ summary: 'List documents with filters' })
  @ApiQuery({ name: 'engagementId', required: false })
  @ApiQuery({ name: 'corpusScope', required: false, enum: CorpusScope })
  @ApiQuery({ name: 'docType', required: false })
  @ApiQuery({ name: 'framework', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAll(
    @Query('engagementId') engagementId?: string,
    @Query('corpusScope') corpusScope?: CorpusScope,
    @Query('docType') docType?: string,
    @Query('framework') framework?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.documentsService.findAll({
      engagementId,
      corpusScope,
      docType,
      framework,
      search,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get document by ID' })
  findOne(@Param('id') id: string) {
    return this.documentsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update document metadata' })
  update(@Param('id') id: string, @Body() dto: UpdateDocumentDto) {
    return this.documentsService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete document' })
  remove(@Param('id') id: string) {
    return this.documentsService.remove(id);
  }

  // ── Admin-only: External Knowledge Base ─────────────────────────────────

  @Post('global')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Upload a document to the global knowledge base (admin only)' })
  createGlobal(@Body() dto: CreateDocumentDto, @Request() req: any) {
    return this.documentsService.create(
      { ...dto, corpusScope: CorpusScope.GLOBAL },
      req.user.id,
    );
  }

  @Delete('global/:id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Delete a document from the global knowledge base (admin only)' })
  removeGlobal(@Param('id') id: string) {
    return this.documentsService.remove(id);
  }
}
