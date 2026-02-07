import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GenerateDraftDto {
  @ApiProperty({ example: 'workpaper-uuid' })
  @IsString()
  workpaperId: string;

  @ApiPropertyOptional({ example: 'Focus on change management controls and their effectiveness' })
  @IsString()
  @IsOptional()
  instructions?: string;
}
