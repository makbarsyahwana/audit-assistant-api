import { IsString, IsEnum, IsOptional, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RequirementPriority } from '@prisma/client';

export class CreateRequirementDto {
  @ApiProperty({ example: 'engagement-uuid' })
  @IsString()
  engagementId: string;

  @ApiProperty({ example: 'ISO 27001' })
  @IsString()
  @MinLength(1)
  framework: string;

  @ApiProperty({ example: 'A.12.1.2' })
  @IsString()
  @MinLength(1)
  clauseId: string;

  @ApiProperty({ example: 'Change Management' })
  @IsString()
  @MinLength(1)
  title: string;

  @ApiPropertyOptional({ example: 'Changes to systems shall be controlled...' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: 'Operations Security' })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiPropertyOptional({ enum: RequirementPriority, default: RequirementPriority.MEDIUM })
  @IsEnum(RequirementPriority)
  @IsOptional()
  priority?: RequirementPriority;
}
