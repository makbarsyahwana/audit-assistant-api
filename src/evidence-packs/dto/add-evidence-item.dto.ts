import { IsString, IsOptional, IsInt } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AddEvidenceItemDto {
  @ApiProperty({ example: 'document-uuid' })
  @IsString()
  documentId: string;

  @ApiPropertyOptional({ example: 'control-uuid' })
  @IsString()
  @IsOptional()
  controlId?: string;

  @ApiPropertyOptional({ example: 'This document demonstrates compliance with...' })
  @IsString()
  @IsOptional()
  rationale?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsInt()
  @IsOptional()
  sortOrder?: number;
}
