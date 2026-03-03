import { IsString, MinLength, IsOptional, IsUUID, IsIn, IsBoolean } from 'class-validator';
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

  @ApiPropertyOptional({
    enum: ['audit', 'legal', 'compliance'],
    default: 'audit',
    description: 'Active application mode',
  })
  @IsIn(['audit', 'legal', 'compliance'])
  @IsOptional()
  mode?: 'audit' | 'legal' | 'compliance';

  @ApiPropertyOptional({
    default: false,
    description: 'Force deep analysis via agentic loop + RLM',
  })
  @IsBoolean()
  @IsOptional()
  forceDeepAnalysis?: boolean;
}
