import { User } from '../../src/domain/entities/User.js';
import { Tenant } from '../../src/domain/entities/Tenant.js';
import { TenantMember } from '../../src/domain/entities/TenantMember.js';
import { Email } from '../../src/domain/value-objects/Email.js';
import { TenantSlug } from '../../src/domain/value-objects/TenantSlug.js';
import { randomUUID } from 'crypto';

export const generateId = () => randomUUID();

export const UserFactory = {
  create: (overrides: Partial<User> = {}): User => {
    return new User({
      id: overrides.id || generateId(),
      email: overrides.email
        ? new Email(overrides.email)
        : new Email(`user-${generateId()}@example.com`),
      name: overrides.name || 'Test User',
      oidcSubject: overrides.oidcSubject || `sub-${generateId()}`,
      oidcIssuer: overrides.oidcIssuer || 'https://example.com',
      isActive: overrides.isActive !== undefined ? overrides.isActive : true,
      createdAt: overrides.createdAt || new Date(),
      ...overrides,
    } as any);
  },
};

export const TenantFactory = {
  create: (overrides: Partial<Tenant> = {}): Tenant => {
    return new Tenant({
      id: overrides.id || generateId(),
      name: overrides.name || 'Test Tenant',
      slug: overrides.slug
        ? new TenantSlug(overrides.slug)
        : new TenantSlug(`tenant-${generateId()}`),
      plan: overrides.plan || 'FREE',
      settings: overrides.settings || { allowAutoApprove: true, minConfidence: 0.7 },
      isActive: overrides.isActive !== undefined ? overrides.isActive : true,
      createdAt: overrides.createdAt || new Date(),
      ...overrides,
    } as any);
  },
};

export const TenantMemberFactory = {
  create: (overrides: Partial<TenantMember> = {}): TenantMember => {
    return new TenantMember({
      id: overrides.id || generateId(),
      tenantId: overrides.tenantId || generateId(),
      userId: overrides.userId || generateId(),
      role: overrides.role || 'VIEWER',
      joinedAt: overrides.joinedAt || new Date(),
      ...overrides,
    } as any);
  },
};
