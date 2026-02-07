import {
  IsString,
  IsEnum,
  IsOptional,
  IsInt,
  IsDateString,
  IsObject,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DocType, Confidentiality } from '@prisma/client';

export class CreateDocumentDto {
  @ApiProperty({ example: 'engagement-uuid' })
  @IsString()
  engagementId: string;

  @ApiProperty({ example: 'ISO 27001 Framework Document' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ enum: DocType, default: DocType.EVIDENCE })
  @IsEnum(DocType)
  @IsOptional()
  docType?: DocType;

  @ApiPropertyOptional({ example: 'sharepoint' })
  @IsString()
  @IsOptional()
  sourceSystem?: string;

  @ApiPropertyOptional({ example: 'https://sharepoint.com/doc/123' })
  @IsString()
  @IsOptional()
  sourceUri?: string;

  @ApiPropertyOptional({ example: 'application/pdf' })
  @IsString()
  @IsOptional()
  mimeType?: string;

  @ApiPropertyOptional({ example: 1024000 })
  @IsInt()
  @IsOptional()
  sizeBytes?: number;

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

  @ApiPropertyOptional({ example: 'acme-corp' })
  @IsString()
  @IsOptional()
  entityId?: string;

  @ApiPropertyOptional({ example: '2025-01-01' })
  @IsDateString()
  @IsOptional()
  periodStart?: string;

  @ApiPropertyOptional({ example: '2025-12-31' })
  @IsDateString()
  @IsOptional()
  periodEnd?: string;

  @ApiPropertyOptional({ enum: Confidentiality, default: Confidentiality.INTERNAL })
  @IsEnum(Confidentiality)
  @IsOptional()
  confidentiality?: Confidentiality;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;
}
