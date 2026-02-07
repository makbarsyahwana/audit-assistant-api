import { IsString, IsEnum, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CoverageLevel } from '@prisma/client';

export class UpdateMappingDto {
  @ApiPropertyOptional({ enum: CoverageLevel })
  @IsEnum(CoverageLevel)
  @IsOptional()
  coverageLevel?: CoverageLevel;

  @ApiPropertyOptional({ example: 'Updated notes' })
  @IsString()
  @IsOptional()
  notes?: string;
}
