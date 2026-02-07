import {
  IsString,
  IsEnum,
  IsOptional,
  IsDateString,
  IsObject,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { DocType, Confidentiality, IngestionStatus } from '@prisma/client';

export class UpdateDocumentDto {
  @ApiPropertyOptional({ example: 'Updated Document Title' })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({ enum: DocType })
  @IsEnum(DocType)
  @IsOptional()
  docType?: DocType;

  @ApiPropertyOptional({ example: 'ISO 27001' })
  @IsString()
  @IsOptional()
  framework?: string;

  @ApiPropertyOptional({ example: 'A.12.1' })
  @IsString()
  @IsOptional()
  clauseId?: string;

  @ApiPropertyOptional({ example: 'CTRL-001' })
  @IsString()
  @IsOptional()
  controlId?: string;

  @ApiPropertyOptional({ example: '2025-01-01' })
  @IsDateString()
  @IsOptional()
  periodStart?: string;

  @ApiPropertyOptional({ example: '2025-12-31' })
  @IsDateString()
  @IsOptional()
  periodEnd?: string;

  @ApiPropertyOptional({ enum: Confidentiality })
  @IsEnum(Confidentiality)
  @IsOptional()
  confidentiality?: Confidentiality;

  @ApiPropertyOptional({ enum: IngestionStatus })
  @IsEnum(IngestionStatus)
  @IsOptional()
  ingestionStatus?: IngestionStatus;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;
}
