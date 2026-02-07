import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { EngagementStatus } from '@prisma/client';

export class TransitionEngagementDto {
  @ApiProperty({
    enum: EngagementStatus,
    example: EngagementStatus.ACTIVE,
    description: 'Target status to transition to',
  })
  @IsEnum(EngagementStatus)
  targetStatus: EngagementStatus;
}
