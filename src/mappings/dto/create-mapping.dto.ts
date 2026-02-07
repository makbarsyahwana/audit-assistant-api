import { IsString, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CoverageLevel } from '@prisma/client';

export class CreateMappingDto {
  @ApiProperty({ example: 'requirement-uuid' })
  @IsString()
  requirementId: string;

  @ApiProperty({ example: 'control-uuid' })
  @IsString()
  controlId: string;

  @ApiPropertyOptional({ enum: CoverageLevel, default: CoverageLevel.PARTIAL })
  @IsEnum(CoverageLevel)
  @IsOptional()
  coverageLevel?: CoverageLevel;

  @ApiPropertyOptional({ example: 'Control partially addresses this requirement' })
  @IsString()
  @IsOptional()
  notes?: string;
}
