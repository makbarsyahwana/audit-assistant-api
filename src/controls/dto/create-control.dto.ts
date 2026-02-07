import { IsString, IsEnum, IsOptional, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ControlType } from '@prisma/client';

export class CreateControlDto {
  @ApiProperty({ example: 'engagement-uuid' })
  @IsString()
  engagementId: string;

  @ApiProperty({ example: 'CTRL-CM-001' })
  @IsString()
  @MinLength(1)
  controlId: string;

  @ApiProperty({ example: 'Change Management Approval' })
  @IsString()
  @MinLength(1)
  title: string;

  @ApiPropertyOptional({ example: 'All changes require approval from change advisory board' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: 'IT Operations Manager' })
  @IsString()
  @IsOptional()
  owner?: string;

  @ApiPropertyOptional({ example: 'Per occurrence' })
  @IsString()
  @IsOptional()
  frequency?: string;

  @ApiPropertyOptional({ enum: ControlType, default: ControlType.MANUAL })
  @IsEnum(ControlType)
  @IsOptional()
  controlType?: ControlType;
}
