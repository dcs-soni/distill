import { describe, it, expect, vi, beforeEach, type Mocked } from 'vitest';
import { GetPendingReviews } from '../../../../src/application/use-cases/GetPendingReviews.js';
import { Review } from '../../../../src/domain/entities/Review.js';
import type { ReviewRepository } from '../../../../src/application/ports/ReviewRepository.port.js';

describe('GetPendingReviews Use Case', () => {
  let mockReviewRepository: Mocked<ReviewRepository>;
  let getPendingReviews: GetPendingReviews;

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

    getPendingReviews = new GetPendingReviews(mockReviewRepository);
  });

  it('should return paginated pending reviews', async () => {
    const mockReviews = [
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
      }),
    ];

    mockReviewRepository.findPending.mockResolvedValue({
      success: true,
      data: mockReviews,
      meta: {
        total: 1,
        page: 1,
        limit: 20,
        hasMore: false,
      },
    });

    const result = await getPendingReviews.execute('tenant-1', 1, 20);

    expect(result.data).toHaveLength(1);
    expect(result.meta.total).toBe(1);
    expect(mockReviewRepository.findPending).toHaveBeenCalledWith('tenant-1', {
      page: 1,
      limit: 20,
      sortBy: undefined,
      priority: undefined,
    });
  });
});
