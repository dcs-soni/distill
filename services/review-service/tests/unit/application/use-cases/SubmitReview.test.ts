import { describe, it, expect, vi, beforeEach, type Mocked } from 'vitest';
import { SubmitReview } from '../../../../src/application/use-cases/SubmitReview.js';
import { Review } from '../../../../src/domain/entities/Review.js';
import type { ReviewRepository } from '../../../../src/application/ports/ReviewRepository.port.js';
import type { EventPublisher } from '../../../../src/application/ports/EventPublisher.port.js';
import { NotFoundError } from '@distill/utils';

describe('SubmitReview Use Case', () => {
  let mockReviewRepository: Mocked<ReviewRepository>;
  let mockEventPublisher: Mocked<EventPublisher>;
  let submitReview: SubmitReview;

  beforeEach(() => {
    mockReviewRepository = {
      save: vi.fn(),
      findById: vi.fn(),
      findByDocumentId: vi.fn(),
      findPending: vi.fn(),
      findCompletedByReviewer: vi.fn(),
      getReviewerStats: vi.fn(),
      countPending: vi.fn(),
      countByPriority: vi.fn(),
    } as unknown as Mocked<ReviewRepository>;

    mockEventPublisher = {
      connect: vi.fn(),
      publish: vi.fn(),
      close: vi.fn(),
    } as unknown as Mocked<EventPublisher>;

    submitReview = new SubmitReview(mockReviewRepository, mockEventPublisher);
  });

  const createPendingReview = () =>
    new Review({
      id: 'rev-1',
      tenantId: 'tenant-1',
      documentId: 'doc-1',
      extractionId: 'ext-1',
      status: 'PENDING',
      priority: 'NORMAL',
      reviewerId: null,
      action: null,
      corrections: [],
      notes: null,
      durationMs: null,
      assignedAt: null,
      completedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

  it('should approve a review successfully', async () => {
    const review = createPendingReview();
    review.startReview('reviewer-1');
    mockReviewRepository.findById.mockResolvedValue(review);

    const result = await submitReview.execute({
      tenantId: 'tenant-1',
      reviewId: 'rev-1',
      reviewerId: 'reviewer-1',
      action: 'APPROVED',
      durationMs: 15000,
    });

    expect(result.status).toBe('COMPLETED');
    expect(result.action).toBe('APPROVED');
    expect(mockReviewRepository.save).toHaveBeenCalledWith(expect.any(Review));
    expect(mockEventPublisher.publish).toHaveBeenCalledWith(
      'review.exchange',
      'review.completed.approved',
      expect.objectContaining({ eventType: 'review.completed' })
    );
  });

  it('should throw NotFoundError if review does not exist', async () => {
    mockReviewRepository.findById.mockResolvedValue(null);

    await expect(
      submitReview.execute({
        tenantId: 'tenant-1',
        reviewId: 'rev-1',
        reviewerId: 'reviewer-1',
        action: 'APPROVED',
        durationMs: 15000,
      })
    ).rejects.toThrow(NotFoundError);
  });

  it('should allow correcting a review', async () => {
    const review = createPendingReview();
    review.startReview('reviewer-1');
    mockReviewRepository.findById.mockResolvedValue(review);

    const corrections = [{ field: 'revenue', originalValue: 100, correctedValue: 200 }];

    await submitReview.execute({
      tenantId: 'tenant-1',
      reviewId: 'rev-1',
      reviewerId: 'reviewer-1',
      action: 'CORRECTED',
      corrections,
      durationMs: 30000,
    });

    expect(mockEventPublisher.publish).toHaveBeenCalledWith(
      'review.exchange',
      'review.completed.corrected',
      expect.objectContaining({ eventType: 'review.completed' })
    );
  });
});
