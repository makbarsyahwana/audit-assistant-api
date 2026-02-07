import { IsString, IsEnum, IsOptional, MinLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ControlType, ControlStatus } from '@prisma/client';

export class UpdateControlDto {
  @ApiPropertyOptional({ example: 'Updated Control Title' })
  @IsString()
  @MinLength(1)
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({ example: 'Updated description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: 'IT Operations Manager' })
  @IsString()
  @IsOptional()
  owner?: string;

  @ApiPropertyOptional({ example: 'Monthly' })
  @IsString()
  @IsOptional()
  frequency?: string;

  @ApiPropertyOptional({ enum: ControlType })
  @IsEnum(ControlType)
  @IsOptional()
  controlType?: ControlType;

  @ApiPropertyOptional({ enum: ControlStatus })
  @IsEnum(ControlStatus)
  @IsOptional()
  status?: ControlStatus;
}
