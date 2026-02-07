import { IsString, IsEnum, IsOptional, MinLength, IsObject } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { WorkpaperTemplate, WorkpaperStatus } from '@prisma/client';

export class UpdateWorkpaperDto {
  @ApiPropertyOptional({ example: 'Updated Title' })
  @IsString()
  @MinLength(1)
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({ enum: WorkpaperTemplate })
  @IsEnum(WorkpaperTemplate)
  @IsOptional()
  templateType?: WorkpaperTemplate;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  criteria?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  condition?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  testing?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  result?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  conclusion?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  draftContent?: string;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  citations?: Record<string, unknown>;

  @ApiPropertyOptional({ enum: WorkpaperStatus })
  @IsEnum(WorkpaperStatus)
  @IsOptional()
  status?: WorkpaperStatus;
}
