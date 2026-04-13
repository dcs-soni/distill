import { describe, it, expect } from 'vitest';
import { TenantSlug } from '../../../src/domain/value-objects/TenantSlug.js';
import { ValidationError } from '@distill/utils';

describe('TenantSlug Value Object', () => {
  it('should create valid tenant slug', () => {
    const slug = new TenantSlug('my-org-123');
    expect(slug.value).toBe('my-org-123');
  });

  it('should trim and lowercase slug', () => {
    const slug = new TenantSlug('  MY-OrG-123  ');
    expect(slug.value).toBe('my-org-123');
  });

  it('should throw ValidationError for empty slug', () => {
    expect(() => new TenantSlug('')).toThrow(ValidationError);
  });

  it('should throw ValidationError for short slug', () => {
    expect(() => new TenantSlug('ab')).toThrow(ValidationError);
  });

  it('should throw ValidationError for invalid characters', () => {
    expect(() => new TenantSlug('my_org')).toThrow(ValidationError);
    expect(() => new TenantSlug('my org')).toThrow(ValidationError);
  });

  it('should correctly evaluate equality', () => {
    const s1 = new TenantSlug('acme-corp');
    const s2 = new TenantSlug('acme-corp');
    expect(s1.equals(s2)).toBe(true);
  });
});
