import { describe, it, expect } from 'vitest';
import { generateId, hashValue } from '../src/crypto.js';
import { validateTenantId, extractTenantId } from '../src/tenant.js';
import { AppError, NotFoundError } from '../src/errors.js';

describe('Crypto Utils', () => {
  it('should generate valid cuid2', () => {
    const id = generateId();
    expect(id).toBeDefined();
    expect(id.length).toBeGreaterThan(0);
  });

  it('should hash values consistently', () => {
    const hash1 = hashValue('test');
    const hash2 = hashValue('test');
    expect(hash1).toEqual(hash2);
    expect(hash1).not.toEqual('test');
  });
});

describe('Errors', () => {
  it('should create correct error subclasses', () => {
    const err = new NotFoundError('User missing');
    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(404);
    expect(err.code).toBe('NOT_FOUND');
    expect(err.message).toBe('User missing');
  });
});

describe('Tenant Utils', () => {
  it('should validate correctly', () => {
    expect(validateTenantId('tenant-123')).toBe(true);
    expect(validateTenantId('123')).toBe(false);
  });

  it('should extract tenant from headers', () => {
    expect(extractTenantId({ 'x-tenant-id': 'tenant-xyz' })).toBe('tenant-xyz');
  });
});
