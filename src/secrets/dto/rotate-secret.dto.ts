import { IsString, MinLength, IsOptional, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RotateSecretDto {
  @ApiProperty({ example: 'new-secret-value-here' })
  @IsString()
  @MinLength(8)
  newValue: string;

  @ApiPropertyOptional({ example: '2026-12-01T00:00:00Z' })
  @IsDateString()
  @IsOptional()
  expiresAt?: string;
}
