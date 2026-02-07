import { IsString, IsEnum, IsOptional, MinLength, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FindingSeverity } from '@prisma/client';

export class CreateFindingDto {
  @ApiProperty({ example: 'engagement-uuid' })
  @IsString()
  engagementId: string;

  @ApiProperty({ example: 'Inadequate Change Management Approval Process' })
  @IsString()
  @MinLength(1)
  title: string;

  @ApiPropertyOptional({ example: 'ISO 27001 A.12.1.2 requires formal change management procedures' })
  @IsString()
  @IsOptional()
  criteria?: string;

  @ApiPropertyOptional({ example: 'Change tickets were approved without CAB review in 3 of 25 samples' })
  @IsString()
  @IsOptional()
  condition?: string;

  @ApiPropertyOptional({ example: 'Lack of awareness of updated approval requirements' })
  @IsString()
  @IsOptional()
  cause?: string;

  @ApiPropertyOptional({ example: 'Unauthorized changes may be deployed to production' })
  @IsString()
  @IsOptional()
  effect?: string;

  @ApiPropertyOptional({ example: 'Implement mandatory CAB review for all production changes' })
  @IsString()
  @IsOptional()
  recommendation?: string;

  @ApiPropertyOptional({ enum: FindingSeverity, default: FindingSeverity.MEDIUM })
  @IsEnum(FindingSeverity)
  @IsOptional()
  severity?: FindingSeverity;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  citations?: Record<string, unknown>;
}
