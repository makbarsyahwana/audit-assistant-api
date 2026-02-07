import { IsString, IsEnum, IsOptional, MinLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { RequirementPriority } from '@prisma/client';

export class UpdateRequirementDto {
  @ApiPropertyOptional({ example: 'Updated Title' })
  @IsString()
  @MinLength(1)
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({ example: 'Updated description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: 'Operations Security' })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiPropertyOptional({ enum: RequirementPriority })
  @IsEnum(RequirementPriority)
  @IsOptional()
  priority?: RequirementPriority;
}
