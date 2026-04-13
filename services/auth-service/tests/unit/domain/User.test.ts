import { describe, it, expect } from 'vitest';
import { User, UserProps } from '../../../src/domain/entities/User.js';
import { Email } from '../../../src/domain/value-objects/Email.js';
import { ValidationError } from '@distill/utils';

describe('User Entity', () => {
  const getValidProps = (): UserProps => ({
    id: 'user_123',
    email: new Email('john@example.com'),
    name: 'John Doe',
    oidcSubject: 'auth0|12345',
    oidcIssuer: 'auth0',
    isActive: true,
    createdAt: new Date('2026-01-01T00:00:00Z'),
  });

  it('should create valid user', () => {
    const props = getValidProps();
    const user = new User(props);
    expect(user.id).toBe('user_123');
    expect(user.email).toBe('john@example.com');
  });

  it('should throw ValidationError for missing oidcSubject', () => {
    const props = getValidProps();
    props.oidcSubject = '';
    expect(() => new User(props)).toThrow(ValidationError);
  });

  it('should deactivate user', () => {
    const user = new User(getValidProps());
    user.deactivate();
    expect(user.isActive).toBe(false);
  });

  it('should update last login', () => {
    const user = new User(getValidProps());
    expect(user.lastLoginAt).toBeUndefined();
    const now = new Date();
    user.updateLastLogin(now);
    expect(user.lastLoginAt).toBe(now);
  });

  it('should serialize to DTO', () => {
    const user = new User(getValidProps());
    const dto = user.toDTO();
    expect(dto.id).toBe('user_123');
    expect(dto.email).toBe('john@example.com');
    expect(dto.isActive).toBe(true);
  });
});
