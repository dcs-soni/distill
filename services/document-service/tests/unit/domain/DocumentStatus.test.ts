import { describe, it, expect } from 'vitest';
import { DocumentStatus } from '../../../src/domain/value-objects/DocumentStatus.js';

describe('DocumentStatus Value Object', () => {
  describe('construction', () => {
    it('creates status for all valid values', () => {
      const validStatuses = [
        'QUEUED',
        'PROCESSING',
        'EXTRACTED',
        'VALIDATED',
        'REVIEW_NEEDED',
        'APPROVED',
        'REJECTED',
        'FAILED',
      ];
      for (const status of validStatuses) {
        expect(new DocumentStatus(status).value).toBe(status);
      }
    });

    it('throws for invalid status value', () => {
      expect(() => new DocumentStatus('INVALID')).toThrow('Invalid document status');
    });

    it('throws for empty string', () => {
      expect(() => new DocumentStatus('')).toThrow('Invalid document status');
    });

    it('throws for lowercase status', () => {
      expect(() => new DocumentStatus('queued')).toThrow('Invalid document status');
    });
  });

  describe('valid transitions', () => {
    const validTransitions: [string, string][] = [
      ['QUEUED', 'PROCESSING'],
      ['QUEUED', 'FAILED'],
      ['PROCESSING', 'EXTRACTED'],
      ['PROCESSING', 'FAILED'],
      ['EXTRACTED', 'VALIDATED'],
      ['EXTRACTED', 'REVIEW_NEEDED'],
      ['EXTRACTED', 'FAILED'],
      ['VALIDATED', 'APPROVED'],
      ['REVIEW_NEEDED', 'APPROVED'],
      ['REVIEW_NEEDED', 'REJECTED'],
      ['REVIEW_NEEDED', 'FAILED'],
      ['FAILED', 'QUEUED'],
    ];

    it.each(validTransitions)('allows transition from %s to %s', (from, to) => {
      const status = new DocumentStatus(from);
      expect(status.canTransitionTo(to as any)).toBe(true);
      const next = status.transitionTo(to as any);
      expect(next.value).toBe(to);
    });
  });

  describe('invalid transitions', () => {
    const invalidTransitions: [string, string][] = [
      ['QUEUED', 'EXTRACTED'],
      ['QUEUED', 'VALIDATED'],
      ['QUEUED', 'APPROVED'],
      ['QUEUED', 'REJECTED'],
      ['PROCESSING', 'QUEUED'],
      ['PROCESSING', 'VALIDATED'],
      ['PROCESSING', 'APPROVED'],
      ['EXTRACTED', 'QUEUED'],
      ['EXTRACTED', 'PROCESSING'],
      ['VALIDATED', 'QUEUED'],
      ['VALIDATED', 'REJECTED'],
      ['APPROVED', 'QUEUED'],
      ['APPROVED', 'REJECTED'],
      ['REJECTED', 'QUEUED'],
      ['REJECTED', 'APPROVED'],
      ['FAILED', 'PROCESSING'],
      ['FAILED', 'APPROVED'],
    ];

    it.each(invalidTransitions)('rejects transition from %s to %s', (from, to) => {
      const status = new DocumentStatus(from);
      expect(status.canTransitionTo(to as any)).toBe(false);
      expect(() => status.transitionTo(to as any)).toThrow('Invalid state transition');
    });
  });

  describe('isTerminal', () => {
    it('returns true for APPROVED', () => {
      expect(new DocumentStatus('APPROVED').isTerminal()).toBe(true);
    });

    it('returns true for REJECTED', () => {
      expect(new DocumentStatus('REJECTED').isTerminal()).toBe(true);
    });

    it('returns false for non-terminal statuses', () => {
      const nonTerminal = [
        'QUEUED',
        'PROCESSING',
        'EXTRACTED',
        'VALIDATED',
        'REVIEW_NEEDED',
        'FAILED',
      ];
      for (const status of nonTerminal) {
        expect(new DocumentStatus(status).isTerminal()).toBe(false);
      }
    });
  });

  describe('equals', () => {
    it('returns true for same status', () => {
      const a = new DocumentStatus('QUEUED');
      const b = new DocumentStatus('QUEUED');
      expect(a.equals(b)).toBe(true);
    });

    it('returns false for different statuses', () => {
      const a = new DocumentStatus('QUEUED');
      const b = new DocumentStatus('PROCESSING');
      expect(a.equals(b)).toBe(false);
    });
  });

  describe('immutability', () => {
    it('transitionTo returns a new instance', () => {
      const original = new DocumentStatus('QUEUED');
      const next = original.transitionTo('PROCESSING');
      expect(original.value).toBe('QUEUED');
      expect(next.value).toBe('PROCESSING');
    });
  });
});
