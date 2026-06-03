import { describe, it, expect } from 'vitest';
import { Review } from '../../../../src/domain/entities/Review.js';
import type { ReviewPriority } from '../../../../src/domain/value-objects/ReviewPriority.js';

import type { Correction } from '@distill/types';

describe('Review Entity', () => {
  const defaultProps = {
    id: 'test-review-123',
    tenantId: 'tenant-123',
    documentId: 'doc-123',
    extractionId: 'ext-123',
    status: 'PENDING' as const,
    priority: 'NORMAL' as ReviewPriority,
    reviewerId: null,
    action: null,
    corrections: [],
    notes: null,
    durationMs: null,
    assignedAt: null,
    completedAt: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
  };

  describe('startReview', () => {
    it('should assign a reviewer and change status to IN_PROGRESS', () => {
      const review = new Review({ ...defaultProps });
      review.startReview('reviewer-1');

      const dto = review.toDTO();
      expect(dto.status).toBe('IN_PROGRESS');
      expect(dto.reviewerId).toBe('reviewer-1');
      expect(dto.assignedAt).toBeInstanceOf(Date);
    });

    it('should throw Error if review is already completed', () => {
      const review = new Review({ ...defaultProps, status: 'COMPLETED' });
      expect(() => review.startReview('reviewer-1')).toThrow(Error);
      expect(() => review.startReview('reviewer-1')).toThrow('Cannot start a completed review');
    });

    it('should allow re-assignment to the same reviewer if IN_PROGRESS', () => {
      const review = new Review({
        ...defaultProps,
        status: 'IN_PROGRESS',
        reviewerId: 'reviewer-1',
        assignedAt: new Date(),
      });
      expect(() => review.startReview('reviewer-1')).not.toThrow();
    });

    it('should allow a different reviewer to take over if IN_PROGRESS', () => {
      const review = new Review({
        ...defaultProps,
        status: 'IN_PROGRESS',
        reviewerId: 'reviewer-1',
        assignedAt: new Date(),
      });
      review.startReview('reviewer-2');
      expect(review.toDTO().reviewerId).toBe('reviewer-2');
    });
  });

  describe('submitApproval', () => {
    it('should approve the review', () => {
      const review = new Review({ ...defaultProps });
      review.startReview('reviewer-1');
      review.submitApproval('reviewer-1', 15000);

      const dto = review.toDTO();
      expect(dto.status).toBe('COMPLETED');
      expect(dto.action).toBe('APPROVED');
      expect(dto.durationMs).toBe(15000);
      expect(dto.completedAt).toBeInstanceOf(Date);
    });

    it('should throw if reviewer does not match', () => {
      const review = new Review({ ...defaultProps });
      review.startReview('reviewer-1');
      expect(() => review.submitApproval('reviewer-2', 15000)).toThrow(Error);
    });
  });

  describe('submitCorrection', () => {
    it('should correct the review', () => {
      const review = new Review({ ...defaultProps });
      review.startReview('reviewer-1');

      const corrections: Correction[] = [
        { field: 'revenue', originalValue: 100, correctedValue: 200 },
      ];

      review.submitCorrection('reviewer-1', corrections, 45000);

      const dto = review.toDTO();
      expect(dto.status).toBe('COMPLETED');
      expect(dto.action).toBe('CORRECTED');
      expect(dto.corrections).toEqual(corrections);
      expect(dto.durationMs).toBe(45000);
    });
  });

  describe('submitRejection', () => {
    it('should reject the review', () => {
      const review = new Review({ ...defaultProps });
      review.startReview('reviewer-1');

      review.submitRejection('reviewer-1', 'Invalid document', 30000);

      const dto = review.toDTO();
      expect(dto.status).toBe('COMPLETED');
      expect(dto.action).toBe('REJECTED');
      expect(dto.notes).toBe('Invalid document');
      expect(dto.durationMs).toBe(30000);
    });

    it('should throw Error if notes are missing', () => {
      const review = new Review({ ...defaultProps });
      review.startReview('reviewer-1');

      expect(() => review.submitRejection('reviewer-1', '', 30000)).toThrow(Error);
    });
  });

  describe('escalate', () => {
    it('should escalate the review', () => {
      const review = new Review({ ...defaultProps });
      review.startReview('reviewer-1');

      review.escalate('reviewer-1', 'Needs manager approval', 60000);

      const dto = review.toDTO();
      expect(dto.status).toBe('PENDING'); // Stays pending, but escalated
      expect(dto.action).toBe('ESCALATED');
      expect(dto.priority).toBe('ESCALATED');
      expect(dto.notes).toBe('Needs manager approval');
      expect(dto.durationMs).toBe(60000);
      expect(dto.reviewerId).toBeNull(); // Unassigned from current reviewer
    });
  });
});
