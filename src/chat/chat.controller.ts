import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { QueryDto } from './dto/query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('chat')
@Controller('chat')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('query')
  @ApiOperation({
    summary: 'Send a query to the AI audit assistant (invokes LangGraph agent)',
  })
  async query(@Body() dto: QueryDto, @Request() req: any) {
    return this.chatService.query(dto, {
      id: req.user.id,
      role: req.user.role,
    });
  }
}
