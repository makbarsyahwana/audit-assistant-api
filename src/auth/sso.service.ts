import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface SsoUserPayload {
  externalId: string;
  displayName: string;
  email: string;
  roles: string[];
  groups: string[];
  provider: 'oidc' | 'saml';
}

@Injectable()
export class SsoService {
  private readonly logger = new Logger(SsoService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Provision or update a user from SSO identity, then issue a JWT.
   */
  async handleSsoLogin(payload: SsoUserPayload) {
    const mappedRole = this.mapExternalRole(payload.roles);

    // Upsert user based on email
    let user = await this.prisma.user.findUnique({
      where: { email: payload.email },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email: payload.email,
          name: payload.displayName,
          role: mappedRole,
          passwordHash: null, // SSO users have no local password
        },
      });
      this.logger.log(
        `Provisioned new SSO user: ${user.email} (role=${mappedRole}, provider=${payload.provider})`,
      );
    } else {
      // Sync role from IdP if it changed
      if (user.role !== mappedRole) {
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: { role: mappedRole, name: payload.displayName },
        });
        this.logger.log(
          `Updated SSO user role: ${user.email} → ${mappedRole}`,
        );
      }
    }

    // Sync group memberships (as engagement memberships) if groups exist
    if (payload.groups.length > 0) {
      await this.syncGroupMemberships(user.id, payload.groups);
    }

    // Issue JWT
    const jwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    return {
      accessToken: this.jwtService.sign(jwtPayload),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }

  /**
   * Map external IdP role names to internal Role enum values.
   */
  private mapExternalRole(externalRoles: string[]): Role {
    const normalized = externalRoles.map((r) => r.toLowerCase().trim());

    if (normalized.includes('admin') || normalized.includes('administrator')) {
      return Role.ADMIN;
    }
    if (
      normalized.includes('audit_manager') ||
      normalized.includes('manager') ||
      normalized.includes('audit-manager')
    ) {
      return Role.AUDIT_MANAGER;
    }
    if (normalized.includes('auditor') || normalized.includes('audit')) {
      return Role.AUDITOR;
    }
    if (normalized.includes('viewer') || normalized.includes('readonly')) {
      return Role.VIEWER;
    }

    // Default to VIEWER for unrecognized roles
    return Role.VIEWER;
  }

  /**
   * Sync IdP group names to engagement group memberships.
   * Groups matching existing engagement groups will auto-assign the user.
   */
  private async syncGroupMemberships(
    userId: string,
    groups: string[],
  ): Promise<void> {
    // Find groups by name that match IdP groups
    const matchingGroups = await this.prisma.group.findMany({
      where: {
        externalId: { in: groups },
      },
      include: { members: true },
    });

    for (const group of matchingGroups) {
      const alreadyMember = group.members.some((m) => m.userId === userId);
      if (!alreadyMember) {
        await this.prisma.groupMember.create({
          data: {
            userId,
            groupId: group.id,
          },
        });
        this.logger.log(
          `Auto-assigned user ${userId} to group ${group.name} via SSO`,
        );
      }
    }
  }
}
