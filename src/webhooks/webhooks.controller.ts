import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WebhooksService } from './webhooks.service';

class RegisterWebhookDto {
  url: string;
  secret: string;
  events: string[];
  enabled: boolean;
  description?: string;
  headers?: Record<string, string>;
}

class UpdateWebhookDto {
  url?: string;
  secret?: string;
  events?: string[];
  enabled?: boolean;
  description?: string;
  headers?: Record<string, string>;
}

@ApiTags('webhooks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Post()
  @ApiOperation({ summary: 'Register a new webhook' })
  register(@Body() dto: RegisterWebhookDto) {
    return this.webhooksService.register(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all registered webhooks' })
  findAll() {
    return this.webhooksService.findAll();
  }

  @Get('events')
  @ApiOperation({ summary: 'List supported webhook event types' })
  getSupportedEvents() {
    return this.webhooksService.getSupportedEvents();
  }

  @Get('deliveries')
  @ApiOperation({ summary: 'Get webhook delivery log' })
  getDeliveryLog(
    @Query('webhookId') webhookId?: string,
    @Query('limit') limit?: string,
  ) {
    return this.webhooksService.getDeliveryLog(
      webhookId,
      limit ? parseInt(limit, 10) : 50,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific webhook' })
  findOne(@Param('id') id: string) {
    return this.webhooksService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a webhook' })
  update(@Param('id') id: string, @Body() dto: UpdateWebhookDto) {
    return this.webhooksService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a webhook' })
  remove(@Param('id') id: string) {
    return this.webhooksService.remove(id);
  }

  @Post('test/:id')
  @ApiOperation({ summary: 'Send a test event to a webhook' })
  async testWebhook(@Param('id') id: string) {
    const webhook = this.webhooksService.findOne(id);
    await this.webhooksService.dispatch('test.ping', {
      webhookId: webhook.id,
      message: 'Test webhook delivery',
    });
    return { sent: true, webhookId: id };
  }
}
