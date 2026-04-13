import { describe, it, expect } from 'vitest';
import { Role } from '../../../src/domain/value-objects/Role.js';
import { ValidationError } from '@distill/utils';

describe('Role Value Object', () => {
  it('should create valid role', () => {
    const role = new Role('ADMIN');
    expect(role.value).toBe('ADMIN');
  });

  it('should throw ValidationError for invalid role', () => {
    expect(() => new Role('SUPER_ADMIN')).toThrow(ValidationError);
  });

  it('should correctly identify ADMIN', () => {
    const r1 = new Role('ADMIN');
    const r2 = new Role('VIEWER');
    expect(r1.isAdmin()).toBe(true);
    expect(r2.isAdmin()).toBe(false);
  });

  it('should correctly identify at least REVIEWER', () => {
    expect(new Role('ADMIN').isAtLeastReviewer()).toBe(true);
    expect(new Role('REVIEWER').isAtLeastReviewer()).toBe(true);
    expect(new Role('VIEWER').isAtLeastReviewer()).toBe(false);
  });
});
