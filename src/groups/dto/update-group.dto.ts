import { IsString, MinLength, IsOptional, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { GroupSource } from '@prisma/client';

export class UpdateGroupDto {
  @ApiPropertyOptional({ example: 'Updated Group Name' })
  @IsString()
  @MinLength(2)
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ example: 'Updated description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: 'cn=new-group,ou=groups,dc=company,dc=com' })
  @IsString()
  @IsOptional()
  externalId?: string;

  @ApiPropertyOptional({ enum: GroupSource })
  @IsEnum(GroupSource)
  @IsOptional()
  source?: GroupSource;
}
