import { IsString, MinLength, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { GroupSource } from '@prisma/client';

export class CreateGroupDto {
  @ApiProperty({ example: 'IT Audit Team' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiPropertyOptional({ example: 'Internal audit team for IT controls' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: 'cn=it-audit,ou=groups,dc=company,dc=com' })
  @IsString()
  @IsOptional()
  externalId?: string;

  @ApiPropertyOptional({ enum: GroupSource, default: GroupSource.LOCAL })
  @IsEnum(GroupSource)
  @IsOptional()
  source?: GroupSource;
}
