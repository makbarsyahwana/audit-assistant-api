import { IsString, MinLength, IsOptional, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSecretDto {
  @ApiProperty({ example: 'jwt-signing-key' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiProperty({ example: 'JWT token signing' })
  @IsString()
  purpose: string;

  @ApiProperty({ example: 'my-secret-value-here' })
  @IsString()
  @MinLength(8)
  value: string;

  @ApiPropertyOptional({ example: '2026-06-01T00:00:00Z' })
  @IsDateString()
  @IsOptional()
  expiresAt?: string;
}
