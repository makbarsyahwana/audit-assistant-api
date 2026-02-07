import { IsString, MinLength, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EngagementStatus } from '@prisma/client';

export class CreateEngagementDto {
  @ApiProperty({ example: 'ISO 27001 Audit 2025' })
  @IsString()
  @MinLength(3)
  name: string;

  @ApiPropertyOptional({ example: 'entity-uuid' })
  @IsString()
  @IsOptional()
  entityId?: string;

  @ApiPropertyOptional({ enum: EngagementStatus, default: EngagementStatus.ACTIVE })
  @IsEnum(EngagementStatus)
  @IsOptional()
  status?: EngagementStatus;
}
