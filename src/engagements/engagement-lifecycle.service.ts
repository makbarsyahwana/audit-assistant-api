import {
  Injectable,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { EngagementStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Valid state transitions for engagement lifecycle:
 *   PLANNING → ACTIVE
 *   ACTIVE   → CLOSED
 *   CLOSED   → ARCHIVED
 *   CLOSED   → ACTIVE   (reopen)
 */
const VALID_TRANSITIONS: Record<EngagementStatus, EngagementStatus[]> = {
  [EngagementStatus.PLANNING]: [EngagementStatus.ACTIVE],
  [EngagementStatus.ACTIVE]: [EngagementStatus.CLOSED],
  [EngagementStatus.CLOSED]: [
    EngagementStatus.ARCHIVED,
    EngagementStatus.ACTIVE,
  ],
  [EngagementStatus.ARCHIVED]: [],
};

export interface TransitionResult {
  id: string;
  previousStatus: EngagementStatus;
  newStatus: EngagementStatus;
  transitionedAt: Date;
  transitionedBy: string;
}

@Injectable()
export class EngagementLifecycleService {
  private readonly logger = new Logger(EngagementLifecycleService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Transition an engagement to a new status with validation.
   */
  async transition(
    engagementId: string,
    targetStatus: EngagementStatus,
    userId: string,
  ): Promise<TransitionResult> {
    const engagement = await this.prisma.engagement.findUnique({
      where: { id: engagementId },
    });

    if (!engagement) {
      throw new BadRequestException(
        `Engagement ${engagementId} not found`,
      );
    }

    const currentStatus = engagement.status;
    const allowed = VALID_TRANSITIONS[currentStatus] || [];

    if (!allowed.includes(targetStatus)) {
      throw new BadRequestException(
        `Cannot transition from ${currentStatus} to ${targetStatus}. ` +
          `Allowed transitions: ${allowed.join(', ') || 'none'}`,
      );
    }

    // Build update data
    const updateData: Record<string, unknown> = {
      status: targetStatus,
    };

    if (targetStatus === EngagementStatus.CLOSED) {
      updateData.closedAt = new Date();
      updateData.closedById = userId;
    }

    if (targetStatus === EngagementStatus.ARCHIVED) {
      updateData.archivedAt = new Date();
    }

    // If reopening, clear closed/archived timestamps
    if (
      targetStatus === EngagementStatus.ACTIVE &&
      currentStatus === EngagementStatus.CLOSED
    ) {
      updateData.closedAt = null;
      updateData.closedById = null;
    }

    await this.prisma.engagement.update({
      where: { id: engagementId },
      data: updateData,
    });

    // Log the transition as an audit event
    await this.prisma.auditEvent.create({
      data: {
        userId,
        engagementId,
        action: 'engagement.transition',
        resourceType: 'Engagement',
        resourceId: engagementId,
        details: {
          from: currentStatus,
          to: targetStatus,
        },
      },
    });

    this.logger.log(
      `Engagement ${engagementId}: ${currentStatus} → ${targetStatus} by ${userId}`,
    );

    return {
      id: engagementId,
      previousStatus: currentStatus,
      newStatus: targetStatus,
      transitionedAt: new Date(),
      transitionedBy: userId,
    };
  }

  /**
   * Get the allowed transitions for an engagement's current status.
   */
  getAllowedTransitions(currentStatus: EngagementStatus): EngagementStatus[] {
    return VALID_TRANSITIONS[currentStatus] || [];
  }

  /**
   * Get lifecycle summary for an engagement.
   */
  async getLifecycleSummary(engagementId: string) {
    const engagement = await this.prisma.engagement.findUnique({
      where: { id: engagementId },
      select: {
        id: true,
        name: true,
        status: true,
        closedAt: true,
        archivedAt: true,
        closedById: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!engagement) {
      throw new BadRequestException(`Engagement ${engagementId} not found`);
    }

    const events = await this.prisma.auditEvent.findMany({
      where: {
        engagementId,
        action: 'engagement.transition',
      },
      orderBy: { createdAt: 'asc' },
      select: {
        action: true,
        details: true,
        createdAt: true,
        userId: true,
      },
    });

    return {
      ...engagement,
      allowedTransitions: this.getAllowedTransitions(engagement.status),
      history: events,
    };
  }
}
