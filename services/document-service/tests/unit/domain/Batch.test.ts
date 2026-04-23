import { describe, it, expect } from 'vitest';
import { Batch } from '../../../src/domain/entities/Batch.js';

function createValidBatchProps(overrides: Partial<Record<string, unknown>> = {}) {
  const now = new Date();
  return {
    id: 'batch-1',
    tenantId: 'tenant-abc',
    name: 'Q4 Reports',
    totalDocuments: 5,
    processedCount: 0,
    failedCount: 0,
    status: 'PENDING' as const,
    uploadedById: 'user-1',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe('Batch Entity', () => {
  describe('construction', () => {
    it('creates a valid batch with required fields', () => {
      const batch = new Batch(createValidBatchProps());
      expect(batch.id).toBe('batch-1');
      expect(batch.tenantId).toBe('tenant-abc');
      expect(batch.name).toBe('Q4 Reports');
      expect(batch.totalDocuments).toBe(5);
      expect(batch.processedCount).toBe(0);
      expect(batch.failedCount).toBe(0);
      expect(batch.status).toBe('PENDING');
    });

    it('throws when tenantId is empty', () => {
      expect(() => new Batch(createValidBatchProps({ tenantId: '' }))).toThrow('tenantId');
    });

    it('throws when tenantId is whitespace', () => {
      expect(() => new Batch(createValidBatchProps({ tenantId: '   ' }))).toThrow('tenantId');
    });

    it('throws when name is empty', () => {
      expect(() => new Batch(createValidBatchProps({ name: '' }))).toThrow('name');
    });

    it('throws when name is whitespace', () => {
      expect(() => new Batch(createValidBatchProps({ name: '   ' }))).toThrow('name');
    });

    it('throws when totalDocuments is 0', () => {
      expect(() => new Batch(createValidBatchProps({ totalDocuments: 0 }))).toThrow('at least 1');
    });

    it('throws when totalDocuments is negative', () => {
      expect(() => new Batch(createValidBatchProps({ totalDocuments: -1 }))).toThrow('at least 1');
    });

    it('throws when totalDocuments exceeds 100', () => {
      expect(() => new Batch(createValidBatchProps({ totalDocuments: 101 }))).toThrow('exceed 100');
    });

    it('allows exactly 100 documents', () => {
      const batch = new Batch(createValidBatchProps({ totalDocuments: 100 }));
      expect(batch.totalDocuments).toBe(100);
    });

    it('allows exactly 1 document', () => {
      const batch = new Batch(createValidBatchProps({ totalDocuments: 1 }));
      expect(batch.totalDocuments).toBe(1);
    });
  });

  describe('incrementProcessed', () => {
    it('increments processedCount by 1', () => {
      const batch = new Batch(createValidBatchProps({ totalDocuments: 3 }));
      batch.incrementProcessed();
      expect(batch.processedCount).toBe(1);
      expect(batch.failedCount).toBe(0);
    });

    it('sets status to COMPLETED when all documents processed successfully', () => {
      const batch = new Batch(createValidBatchProps({ totalDocuments: 2, processedCount: 1 }));
      batch.incrementProcessed();
      expect(batch.processedCount).toBe(2);
      expect(batch.status).toBe('COMPLETED');
    });

    it('updates updatedAt timestamp', () => {
      const oldDate = new Date('2020-01-01');
      const batch = new Batch(createValidBatchProps({ updatedAt: oldDate, totalDocuments: 5 }));
      batch.incrementProcessed();
      expect(batch.updatedAt.getTime()).toBeGreaterThan(oldDate.getTime());
    });
  });

  describe('incrementFailed', () => {
    it('increments both failedCount and processedCount', () => {
      const batch = new Batch(createValidBatchProps({ totalDocuments: 3 }));
      batch.incrementFailed();
      expect(batch.failedCount).toBe(1);
      expect(batch.processedCount).toBe(1);
    });

    it('sets status to FAILED when all documents fail', () => {
      const batch = new Batch(createValidBatchProps({ totalDocuments: 1 }));
      batch.incrementFailed();
      expect(batch.status).toBe('FAILED');
      expect(batch.failedCount).toBe(1);
    });

    it('sets status to COMPLETED (not FAILED) when some succeed', () => {
      const batch = new Batch(
        createValidBatchProps({
          totalDocuments: 2,
          processedCount: 1,
          failedCount: 0,
        })
      );
      batch.incrementFailed();
      expect(batch.status).toBe('COMPLETED');
    });
  });

  describe('isComplete', () => {
    it('returns false when processedCount < totalDocuments', () => {
      const batch = new Batch(createValidBatchProps({ totalDocuments: 5, processedCount: 3 }));
      expect(batch.isComplete()).toBe(false);
    });

    it('returns true when processedCount equals totalDocuments', () => {
      const batch = new Batch(createValidBatchProps({ totalDocuments: 3, processedCount: 3 }));
      expect(batch.isComplete()).toBe(true);
    });

    it('returns true when processedCount exceeds totalDocuments', () => {
      const batch = new Batch(createValidBatchProps({ totalDocuments: 3, processedCount: 4 }));
      expect(batch.isComplete()).toBe(true);
    });
  });

  describe('markProcessing', () => {
    it('sets status to PROCESSING', () => {
      const batch = new Batch(createValidBatchProps());
      batch.markProcessing();
      expect(batch.status).toBe('PROCESSING');
    });
  });

  describe('toDTO', () => {
    it('serializes all fields correctly', () => {
      const now = new Date('2026-03-01T12:00:00Z');
      const batch = new Batch(createValidBatchProps({ createdAt: now, updatedAt: now }));
      const dto = batch.toDTO();

      expect(dto.id).toBe('batch-1');
      expect(dto.tenantId).toBe('tenant-abc');
      expect(dto.name).toBe('Q4 Reports');
      expect(dto.totalDocuments).toBe(5);
      expect(dto.processedCount).toBe(0);
      expect(dto.failedCount).toBe(0);
      expect(dto.status).toBe('PENDING');
      expect(dto.uploadedById).toBe('user-1');
      expect(dto.createdAt).toBe('2026-03-01T12:00:00.000Z');
      expect(dto.updatedAt).toBe('2026-03-01T12:00:00.000Z');
    });
  });
});
