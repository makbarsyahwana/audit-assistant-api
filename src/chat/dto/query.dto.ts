import { IsString, MinLength, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class QueryDto {
  @ApiProperty({ example: 'What controls address change management per ISO 27001?' })
  @IsString()
  @MinLength(3)
  query: string;

  @ApiProperty({ example: 'engagement-uuid' })
  @IsUUID()
  engagementId: string;

  @ApiPropertyOptional({
    example: 'thread-uuid',
    description: 'Chat session ID for multi-turn conversations',
  })
  @IsString()
  @IsOptional()
  threadId?: string;
}
