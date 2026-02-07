import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { EngagementsService } from './engagements.service';
import { CreateEngagementDto } from './dto/create-engagement.dto';
import { UpdateEngagementDto } from './dto/update-engagement.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('engagements')
@Controller('engagements')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class EngagementsController {
  constructor(private readonly engagementsService: EngagementsService) {}

  @Post()
  @Roles(Role.ADMIN, Role.AUDIT_MANAGER)
  @ApiOperation({ summary: 'Create a new engagement' })
  create(@Body() dto: CreateEngagementDto) {
    return this.engagementsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List engagements (scoped by membership)' })
  findAll(@Request() req: any) {
    return this.engagementsService.findAll(req.user.id, req.user.role);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get engagement by ID' })
  findOne(@Param('id') id: string) {
    return this.engagementsService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.AUDIT_MANAGER)
  @ApiOperation({ summary: 'Update engagement' })
  update(@Param('id') id: string, @Body() dto: UpdateEngagementDto) {
    return this.engagementsService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Delete engagement (Admin only)' })
  remove(@Param('id') id: string) {
    return this.engagementsService.remove(id);
  }

  @Post(':id/members')
  @Roles(Role.ADMIN, Role.AUDIT_MANAGER)
  @ApiOperation({ summary: 'Add member to engagement' })
  addMember(@Param('id') id: string, @Body() dto: AddMemberDto) {
    return this.engagementsService.addMember(id, dto);
  }

  @Delete(':id/members/:userId')
  @Roles(Role.ADMIN, Role.AUDIT_MANAGER)
  @ApiOperation({ summary: 'Remove member from engagement' })
  removeMember(@Param('id') id: string, @Param('userId') userId: string) {
    return this.engagementsService.removeMember(id, userId);
  }
}
