import { Controller, Get, Header } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { MetricsService } from './metrics.service';

@ApiTags('observability')
@Controller()
export class MetricsController {
  constructor(private readonly metrics: MetricsService) {}

  @Get('metrics')
  @Header('Content-Type', 'text/plain; charset=utf-8')
  @ApiOperation({ summary: 'Prometheus metrics endpoint' })
  getMetrics(): string {
    return this.metrics.render();
  }
}
