import { describe, it, expect } from 'vitest';
import { TenantMember, TenantMemberProps } from '../../../src/domain/entities/TenantMember.js';
import { Role } from '../../../src/domain/value-objects/Role.js';

describe('TenantMember Entity', () => {
  const getValidProps = (): TenantMemberProps => ({
    id: 'mem_123',
    tenantId: 'tenant_123',
    userId: 'user_123',
    role: new Role('VIEWER'),
    joinedAt: new Date('2026-01-01T00:00:00Z'),
  });

  it('should create valid tenant member', () => {
    const member = new TenantMember(getValidProps());
    expect(member.id).toBe('mem_123');
    expect(member.role).toBe('VIEWER');
    expect(member.isAdmin()).toBe(false);
  });

  it('should change role', () => {
    const member = new TenantMember(getValidProps());
    member.changeRole(new Role('ADMIN'));
    expect(member.role).toBe('ADMIN');
    expect(member.isAdmin()).toBe(true);
  });

  it('should serialize to DTO', () => {
    const member = new TenantMember(getValidProps());
    const dto = member.toDTO();
    expect(dto.id).toBe('mem_123');
    expect(dto.tenantId).toBe('tenant_123');
    expect(dto.userId).toBe('user_123');
    expect(dto.role).toBe('VIEWER');
  });
});
