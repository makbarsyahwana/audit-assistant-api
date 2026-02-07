import { IsString, IsEnum, IsOptional, MinLength, IsObject } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { FindingSeverity, FindingStatus } from '@prisma/client';

export class UpdateFindingDto {
  @ApiPropertyOptional({ example: 'Updated Finding Title' })
  @IsString()
  @MinLength(1)
  @IsOptional()
  title?: string;

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
  cause?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  effect?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  recommendation?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  managementResponse?: string;

  @ApiPropertyOptional({ enum: FindingSeverity })
  @IsEnum(FindingSeverity)
  @IsOptional()
  severity?: FindingSeverity;

  @ApiPropertyOptional({ enum: FindingStatus })
  @IsEnum(FindingStatus)
  @IsOptional()
  status?: FindingStatus;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  citations?: Record<string, unknown>;
}
