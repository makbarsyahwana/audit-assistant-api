import { IsString, IsOptional, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateEvidencePackDto {
  @ApiProperty({ example: 'engagement-uuid' })
  @IsString()
  engagementId: string;

  @ApiProperty({ example: 'Change Management Evidence Pack Q1 2025' })
  @IsString()
  @MinLength(1)
  name: string;

  @ApiPropertyOptional({ example: 'Evidence supporting change management controls' })
  @IsString()
  @IsOptional()
  description?: string;
}
