import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { PrismaAuthRepository } from '../../src/infrastructure/persistence/PrismaAuthRepository.js';
import { CreateTenant } from '../../src/application/use-cases/CreateTenant.js';
import { InviteMember } from '../../src/application/use-cases/InviteMember.js';
import { AssignRole } from '../../src/application/use-cases/AssignRole.js';
import prisma from '../../src/infrastructure/persistence/prismaClient.js';
import { clearDatabase, clearRedis } from './setup.js';

describe('Tenant Flow Integration', () => {
  let authRepository: PrismaAuthRepository;
  let createTenant: CreateTenant;
  let inviteMember: InviteMember;
  let assignRole: AssignRole;

  beforeAll(async () => {
    authRepository = new PrismaAuthRepository();

    createTenant = new CreateTenant(authRepository);
    inviteMember = new InviteMember(authRepository);
    assignRole = new AssignRole(authRepository);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await clearDatabase();
    await clearRedis();
  });

  it('should create tenant, invite member, and assign role', async () => {
    // 1. Create two users manually
    const user1 = await authRepository.upsertOIDCUser({
      oidcSubject: 'sub1',
      oidcIssuer: 'test',
      email: 'admin@example.com',
      name: 'Admin',
      lastLoginAt: new Date(),
    });

    const user2 = await authRepository.upsertOIDCUser({
      oidcSubject: 'sub2',
      oidcIssuer: 'test',
      email: 'member@example.com',
      name: 'Member',
      lastLoginAt: new Date(),
    });

    // 2. User1 creates a tenant
    const tenant = await createTenant.execute(user1.id, 'My Corp', 'my-corp');
    expect(tenant.name).toBe('My Corp');
    expect(tenant.slug).toBe('my-corp');

    // Verify admin membership
    const members = await authRepository.listTenantMembers(tenant.id);
    expect(members).toHaveLength(1);
    expect(members[0].userId).toBe(user1.id);
    expect(members[0].role).toBe('ADMIN');

    // 3. Invite User2
    const membership = await inviteMember.execute(tenant.id, 'member@example.com', 'VIEWER');
    expect(membership.userId).toBe(user2.id);
    expect(membership.role).toBe('VIEWER');

    // 4. Update User2 role to REVIEWER
    const updated = await assignRole.execute(tenant.id, membership.id, 'REVIEWER');
    expect(updated.role).toBe('REVIEWER');

    // Verify final state
    const finalMembers = await authRepository.listTenantMembers(tenant.id);
    expect(finalMembers).toHaveLength(2);
    expect(finalMembers.some((m) => m.userId === user2.id && m.role === 'REVIEWER')).toBe(true);
  });
});
