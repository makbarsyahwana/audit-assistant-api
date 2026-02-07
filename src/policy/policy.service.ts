import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  AuthUser,
  AppAbility,
  createAbilityForUser,
} from './casl-ability.factory';

@Injectable()
export class PolicyService {
  constructor(private readonly prisma: PrismaService) {}

  createAbility(user: AuthUser): AppAbility {
    return createAbilityForUser(user);
  }

  async getUserEngagementIds(userId: string): Promise<string[]> {
    const memberships = await this.prisma.engagementMember.findMany({
      where: { userId },
      select: { engagementId: true },
    });
    return memberships.map((m) => m.engagementId);
  }

  async checkEngagementAccess(
    userId: string,
    engagementId: string,
    userRole: string,
  ): Promise<void> {
    // Admins have access to all engagements
    if (userRole === 'ADMIN') return;

    const membership = await this.prisma.engagementMember.findUnique({
      where: {
        userId_engagementId: { userId, engagementId },
      },
    });

    if (!membership) {
      throw new ForbiddenException(
        'You do not have access to this engagement',
      );
    }
  }

  async getEngagementFilters(
    userId: string,
    userRole: string,
  ): Promise<{ engagementIds: string[] }> {
    if (userRole === 'ADMIN') {
      const allEngagements = await this.prisma.engagement.findMany({
        select: { id: true },
      });
      return { engagementIds: allEngagements.map((e) => e.id) };
    }

    const engagementIds = await this.getUserEngagementIds(userId);
    return { engagementIds };
  }
}
