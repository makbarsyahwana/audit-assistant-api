import { IsString, IsEnum, IsOptional, MinLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { EvidencePackStatus } from '@prisma/client';

export class UpdateEvidencePackDto {
  @ApiPropertyOptional({ example: 'Updated Pack Name' })
  @IsString()
  @MinLength(1)
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ example: 'Updated description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ enum: EvidencePackStatus })
  @IsEnum(EvidencePackStatus)
  @IsOptional()
  status?: EvidencePackStatus;
}
