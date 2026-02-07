import { IsString, IsEnum, IsOptional, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WorkpaperTemplate } from '@prisma/client';

export class CreateWorkpaperDto {
  @ApiProperty({ example: 'engagement-uuid' })
  @IsString()
  engagementId: string;

  @ApiProperty({ example: 'Change Management Walkthrough' })
  @IsString()
  @MinLength(1)
  title: string;

  @ApiPropertyOptional({ enum: WorkpaperTemplate, default: WorkpaperTemplate.GENERAL })
  @IsEnum(WorkpaperTemplate)
  @IsOptional()
  templateType?: WorkpaperTemplate;

  @ApiPropertyOptional({ example: 'ISO 27001 A.12.1.2 requires...' })
  @IsString()
  @IsOptional()
  criteria?: string;

  @ApiPropertyOptional({ example: 'The organization has implemented...' })
  @IsString()
  @IsOptional()
  condition?: string;

  @ApiPropertyOptional({ example: 'Reviewed change tickets from Q1 2025...' })
  @IsString()
  @IsOptional()
  testing?: string;

  @ApiPropertyOptional({ example: 'No exceptions noted.' })
  @IsString()
  @IsOptional()
  result?: string;

  @ApiPropertyOptional({ example: 'The control is operating effectively.' })
  @IsString()
  @IsOptional()
  conclusion?: string;
}
