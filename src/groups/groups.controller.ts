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
import { Role } from '@prisma/client';
import { GroupsService } from './groups.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { AddGroupMemberDto } from './dto/add-group-member.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('groups')
@Controller('groups')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Create a new group' })
  create(@Body() dto: CreateGroupDto) {
    return this.groupsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all groups' })
  @ApiQuery({ name: 'search', required: false })
  findAll(@Query('search') search?: string) {
    return this.groupsService.findAll(search);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get group by ID' })
  findOne(@Param('id') id: string) {
    return this.groupsService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update group' })
  update(@Param('id') id: string, @Body() dto: UpdateGroupDto) {
    return this.groupsService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Delete group' })
  remove(@Param('id') id: string) {
    return this.groupsService.remove(id);
  }

  @Post(':id/members')
  @Roles(Role.ADMIN, Role.AUDIT_MANAGER)
  @ApiOperation({ summary: 'Add member to group' })
  addMember(@Param('id') id: string, @Body() dto: AddGroupMemberDto) {
    return this.groupsService.addMember(id, dto);
  }

  @Delete(':id/members/:userId')
  @Roles(Role.ADMIN, Role.AUDIT_MANAGER)
  @ApiOperation({ summary: 'Remove member from group' })
  removeMember(@Param('id') id: string, @Param('userId') userId: string) {
    return this.groupsService.removeMember(id, userId);
  }

  @Post('sync')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Sync groups from identity provider' })
  syncFromIdp(
    @Body()
    body: {
      groups: Array<{ externalId: string; name: string; source: string }>;
    },
  ) {
    return this.groupsService.syncFromIdp(body.groups);
  }
}
