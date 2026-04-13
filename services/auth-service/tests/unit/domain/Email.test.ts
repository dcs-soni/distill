import { describe, it, expect } from 'vitest';
import { Email } from '../../../src/domain/value-objects/Email.js';
import { ValidationError } from '@distill/utils';

describe('Email Value Object', () => {
  it('should create valid email', () => {
    const email = new Email('test@example.com');
    expect(email.value).toBe('test@example.com');
  });

  it('should trim and lowercase email', () => {
    const email = new Email('  TEST@eXample.com  ');
    expect(email.value).toBe('test@example.com');
  });

  it('should throw ValidationError for empty email', () => {
    expect(() => new Email('')).toThrow(ValidationError);
  });

  it('should throw ValidationError for invalid format', () => {
    expect(() => new Email('invalid-email')).toThrow(ValidationError);
    expect(() => new Email('test@')).toThrow(ValidationError);
  });

  it('should correctly evaluate equality', () => {
    const email1 = new Email('test@example.com');
    const email2 = new Email('  TEST@example.com');
    expect(email1.equals(email2)).toBe(true);
  });
});
