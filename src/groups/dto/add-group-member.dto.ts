import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddGroupMemberDto {
  @ApiProperty({ example: 'user-uuid' })
  @IsString()
  userId: string;
}
