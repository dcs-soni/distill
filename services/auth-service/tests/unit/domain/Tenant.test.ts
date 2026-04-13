import { describe, it, expect } from 'vitest';
import { Tenant, TenantProps } from '../../../src/domain/entities/Tenant.js';
import { TenantSlug } from '../../../src/domain/value-objects/TenantSlug.js';
import { ValidationError } from '@distill/utils';

describe('Tenant Entity', () => {
  const getValidProps = (): TenantProps => ({
    id: 'tenant_123',
    name: 'Acme Corp',
    slug: new TenantSlug('acme-corp'),
    plan: 'FREE',
    settings: { allowAutoApprove: false, minConfidence: 0.8 },
    isActive: true,
    createdAt: new Date('2026-01-01T00:00:00Z'),
  });

  it('should create valid tenant', () => {
    const tenant = new Tenant(getValidProps());
    expect(tenant.id).toBe('tenant_123');
    expect(tenant.slug).toBe('acme-corp');
  });

  it('should throw ValidationError for empty name', () => {
    const props = getValidProps();
    props.name = '   ';
    expect(() => new Tenant(props)).toThrow(ValidationError);
  });

  it('should update settings', () => {
    const tenant = new Tenant(getValidProps());
    tenant.updateSettings({ minConfidence: 0.9 });
    expect(tenant.settings.allowAutoApprove).toBe(false); // preserved
    expect(tenant.settings.minConfidence).toBe(0.9); // updated
  });

  it('should upgrade plan', () => {
    const tenant = new Tenant(getValidProps());
    tenant.upgradePlan('PRO');
    expect(tenant.plan).toBe('PRO');
  });

  it('should deactivate', () => {
    const tenant = new Tenant(getValidProps());
    tenant.deactivate();
    expect(tenant.isActive).toBe(false);
  });

  it('should serialize to DTO', () => {
    const tenant = new Tenant(getValidProps());
    const dto = tenant.toDTO();
    expect(dto.id).toBe('tenant_123');
    expect(dto.name).toBe('Acme Corp');
    expect(dto.slug).toBe('acme-corp');
    expect(dto.plan).toBe('FREE');
  });
});
