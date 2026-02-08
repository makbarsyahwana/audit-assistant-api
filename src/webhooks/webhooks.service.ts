import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';

export interface WebhookConfig {
  id?: string;
  url: string;
  secret: string;
  events: string[];
  enabled: boolean;
  description?: string;
  headers?: Record<string, string>;
  createdAt?: Date;
}

export interface WebhookEvent {
  id: string;
  event: string;
  payload: Record<string, any>;
  timestamp: string;
  source: string;
}

export interface WebhookDelivery {
  webhookId: string;
  eventId: string;
  event: string;
  url: string;
  status: 'pending' | 'success' | 'failed';
  statusCode?: number;
  responseBody?: string;
  error?: string;
  attempts: number;
  deliveredAt?: Date;
}

// Supported webhook event types
export const WEBHOOK_EVENTS = [
  'engagement.created',
  'engagement.updated',
  'engagement.closed',
  'document.ingested',
  'document.deleted',
  'finding.created',
  'finding.updated',
  'evidence_pack.created',
  'evidence_pack.exported',
  'workpaper.created',
  'workpaper.updated',
  'approval.requested',
  'approval.approved',
  'approval.rejected',
  'sync.completed',
  'sync.failed',
] as const;

export type WebhookEventType = (typeof WEBHOOK_EVENTS)[number];

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  // In-memory webhook registry (in production, persist to DB)
  private webhooks: Map<string, WebhookConfig> = new Map();
  private deliveryLog: WebhookDelivery[] = [];

  constructor(private readonly prisma: PrismaService) {}

  // ------------------------------------------------------------------
  // Webhook CRUD
  // ------------------------------------------------------------------

  register(config: Omit<WebhookConfig, 'id' | 'createdAt'>): WebhookConfig {
    const id = crypto.randomUUID();
    const webhook: WebhookConfig = {
      ...config,
      id,
      createdAt: new Date(),
    };
    this.webhooks.set(id, webhook);
    this.logger.log(`Webhook registered: ${id} -> ${config.url}`);
    return webhook;
  }

  findAll(): WebhookConfig[] {
    return Array.from(this.webhooks.values()).map((w) => ({
      ...w,
      secret: '***masked***',
    }));
  }

  findOne(id: string): WebhookConfig {
    const webhook = this.webhooks.get(id);
    if (!webhook) {
      throw new NotFoundException(`Webhook ${id} not found`);
    }
    return { ...webhook, secret: '***masked***' };
  }

  update(
    id: string,
    updates: Partial<Omit<WebhookConfig, 'id' | 'createdAt'>>,
  ): WebhookConfig {
    const existing = this.webhooks.get(id);
    if (!existing) {
      throw new NotFoundException(`Webhook ${id} not found`);
    }
    const updated = { ...existing, ...updates };
    this.webhooks.set(id, updated);
    return { ...updated, secret: '***masked***' };
  }

  remove(id: string): { deleted: boolean } {
    if (!this.webhooks.has(id)) {
      throw new NotFoundException(`Webhook ${id} not found`);
    }
    this.webhooks.delete(id);
    return { deleted: true };
  }

  // ------------------------------------------------------------------
  // Event dispatch
  // ------------------------------------------------------------------

  async dispatch(event: string, payload: Record<string, any>): Promise<void> {
    const webhookEvent: WebhookEvent = {
      id: crypto.randomUUID(),
      event,
      payload,
      timestamp: new Date().toISOString(),
      source: 'audit-assistant-api',
    };

    const targets = Array.from(this.webhooks.values()).filter(
      (w) => w.enabled && (w.events.includes(event) || w.events.includes('*')),
    );

    if (targets.length === 0) {
      return;
    }

    this.logger.log(
      `Dispatching event "${event}" to ${targets.length} webhook(s)`,
    );

    // Fire-and-forget with retry logic
    const deliveries = targets.map((webhook) =>
      this.deliver(webhook, webhookEvent),
    );
    await Promise.allSettled(deliveries);
  }

  private async deliver(
    webhook: WebhookConfig,
    event: WebhookEvent,
  ): Promise<void> {
    const MAX_ATTEMPTS = 3;
    const delivery: WebhookDelivery = {
      webhookId: webhook.id!,
      eventId: event.id,
      event: event.event,
      url: webhook.url,
      status: 'pending',
      attempts: 0,
    };

    const body = JSON.stringify(event);
    const signature = this.sign(body, webhook.secret);

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      delivery.attempts = attempt;
      try {
        const response = await fetch(webhook.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Signature': signature,
            'X-Webhook-Event': event.event,
            'X-Webhook-ID': event.id,
            ...(webhook.headers || {}),
          },
          body,
          signal: AbortSignal.timeout(10_000),
        });

        delivery.statusCode = response.status;

        if (response.ok) {
          delivery.status = 'success';
          delivery.deliveredAt = new Date();
          this.logger.debug(
            `Webhook delivered: ${event.event} -> ${webhook.url} (${response.status})`,
          );
          break;
        } else {
          delivery.responseBody = await response.text().catch(() => '');
          this.logger.warn(
            `Webhook delivery failed (attempt ${attempt}/${MAX_ATTEMPTS}): ${response.status}`,
          );
        }
      } catch (err: any) {
        delivery.error = err.message || String(err);
        this.logger.warn(
          `Webhook delivery error (attempt ${attempt}/${MAX_ATTEMPTS}): ${delivery.error}`,
        );
      }

      // Exponential backoff before retry
      if (attempt < MAX_ATTEMPTS) {
        await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt)));
      }
    }

    if (delivery.status !== 'success') {
      delivery.status = 'failed';
    }

    // Keep last 1000 delivery records
    this.deliveryLog.push(delivery);
    if (this.deliveryLog.length > 1000) {
      this.deliveryLog = this.deliveryLog.slice(-1000);
    }
  }

  // ------------------------------------------------------------------
  // Signature
  // ------------------------------------------------------------------

  private sign(payload: string, secret: string): string {
    return `sha256=${crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex')}`;
  }

  verifySignature(
    payload: string,
    signature: string,
    secret: string,
  ): boolean {
    const expected = this.sign(payload, secret);
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expected),
    );
  }

  // ------------------------------------------------------------------
  // Delivery log
  // ------------------------------------------------------------------

  getDeliveryLog(webhookId?: string, limit = 50): WebhookDelivery[] {
    let log = this.deliveryLog;
    if (webhookId) {
      log = log.filter((d) => d.webhookId === webhookId);
    }
    return log.slice(-limit).reverse();
  }

  getSupportedEvents(): string[] {
    return [...WEBHOOK_EVENTS];
  }
}
