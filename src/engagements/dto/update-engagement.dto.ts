import { IsString, MinLength, IsEnum, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { EngagementStatus } from '@prisma/client';

export class UpdateEngagementDto {
  @ApiPropertyOptional({ example: 'Updated Engagement Name' })
  @IsString()
  @MinLength(3)
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ example: 'entity-uuid' })
  @IsString()
  @IsOptional()
  entityId?: string;

  @ApiPropertyOptional({ enum: EngagementStatus })
  @IsEnum(EngagementStatus)
  @IsOptional()
  status?: EngagementStatus;
}
