import {
  AbilityBuilder,
  createMongoAbility,
  MongoAbility,
  InferSubjects,
} from '@casl/ability';
import { Role } from '@prisma/client';

type Actions = 'manage' | 'create' | 'read' | 'update' | 'delete' | 'query';
type Subjects =
  | 'Engagement'
  | 'User'
  | 'QueryLog'
  | 'Document'
  | 'AuditTrail'
  | 'all';

export type AppAbility = MongoAbility<[Actions, Subjects]>;

export interface AuthUser {
  id: string;
  email: string;
  role: Role;
  engagementIds?: string[];
}

export function createAbilityForUser(user: AuthUser): AppAbility {
  const { can, cannot, build } = new AbilityBuilder<AppAbility>(
    createMongoAbility,
  );

  switch (user.role) {
    case Role.ADMIN:
      can('manage', 'all');
      break;

    case Role.AUDIT_MANAGER:
      can('manage', 'Engagement');
      can('read', 'User');
      can('manage', 'Document');
      can('query', 'Engagement');
      can('read', 'AuditTrail');
      can('read', 'QueryLog');
      break;

    case Role.AUDITOR:
      can('read', 'Engagement');
      can('query', 'Engagement');
      can('read', 'Document');
      can('create', 'Document');
      can('read', 'QueryLog');
      break;

    case Role.VIEWER:
      can('read', 'Engagement');
      can('read', 'Document');
      can('read', 'QueryLog');
      break;

    default:
      break;
  }

  return build();
}
