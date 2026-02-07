import { PrismaClient, Role, EngagementStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create admin user
  const adminPasswordHash = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@audit.local' },
    update: {},
    create: {
      email: 'admin@audit.local',
      name: 'System Admin',
      role: Role.ADMIN,
      passwordHash: adminPasswordHash,
    },
  });
  console.log(`  Admin user: ${admin.email} (id: ${admin.id})`);

  // Create audit manager
  const managerPasswordHash = await bcrypt.hash('manager123', 10);
  const manager = await prisma.user.upsert({
    where: { email: 'manager@audit.local' },
    update: {},
    create: {
      email: 'manager@audit.local',
      name: 'Audit Manager',
      role: Role.AUDIT_MANAGER,
      passwordHash: managerPasswordHash,
    },
  });
  console.log(`  Manager user: ${manager.email} (id: ${manager.id})`);

  // Create auditor
  const auditorPasswordHash = await bcrypt.hash('auditor123', 10);
  const auditor = await prisma.user.upsert({
    where: { email: 'auditor@audit.local' },
    update: {},
    create: {
      email: 'auditor@audit.local',
      name: 'John Auditor',
      role: Role.AUDITOR,
      passwordHash: auditorPasswordHash,
    },
  });
  console.log(`  Auditor user: ${auditor.email} (id: ${auditor.id})`);

  // Create sample engagement
  const engagement = await prisma.engagement.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'ISO 27001 Audit 2025',
      status: EngagementStatus.ACTIVE,
      entityId: 'acme-corp',
    },
  });
  console.log(`  Engagement: ${engagement.name} (id: ${engagement.id})`);

  // Add members to engagement
  for (const user of [admin, manager, auditor]) {
    await prisma.engagementMember.upsert({
      where: {
        userId_engagementId: {
          userId: user.id,
          engagementId: engagement.id,
        },
      },
      update: {},
      create: {
        userId: user.id,
        engagementId: engagement.id,
        role: user.role,
      },
    });
  }
  console.log(`  Added ${3} members to engagement`);

  console.log('Seeding complete.');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
