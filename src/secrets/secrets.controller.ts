import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { SecretsService } from './secrets.service';
import { CreateSecretDto } from './dto/create-secret.dto';
import { RotateSecretDto } from './dto/rotate-secret.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('secrets')
@Controller('secrets')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@ApiBearerAuth()
export class SecretsController {
  constructor(private readonly secretsService: SecretsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new managed secret (Admin only)' })
  create(@Body() dto: CreateSecretDto) {
    return this.secretsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all managed secrets (metadata only)' })
  findAll() {
    return this.secretsService.findAll();
  }

  @Get('expiring')
  @ApiOperation({ summary: 'List secrets expiring within N days' })
  @ApiQuery({ name: 'days', required: false, type: Number })
  checkExpiring(@Query('days') days?: string) {
    return this.secretsService.checkExpiring(days ? parseInt(days, 10) : 30);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get secret metadata by ID' })
  findOne(@Param('id') id: string) {
    return this.secretsService.findOne(id);
  }

  @Post(':id/rotate')
  @ApiOperation({ summary: 'Rotate a secret with a new value' })
  rotate(@Param('id') id: string, @Body() dto: RotateSecretDto) {
    return this.secretsService.rotate(id, dto);
  }

  @Post(':id/revoke')
  @ApiOperation({ summary: 'Revoke a secret (makes it unusable)' })
  revoke(@Param('id') id: string) {
    return this.secretsService.revoke(id);
  }
}
