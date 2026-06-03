import { describe, it, expect, beforeAll, afterAll, vi, type Mocked } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import { GetPendingReviews } from '../../src/application/use-cases/GetPendingReviews.js';
import { GetReviewDetail } from '../../src/application/use-cases/GetReviewDetail.js';
import { SubmitReview } from '../../src/application/use-cases/SubmitReview.js';
import { GetReviewerStats } from '../../src/application/use-cases/GetReviewerStats.js';
import { ReviewController } from '../../src/infrastructure/web/controllers/ReviewController.js';
import { reviewRoutes } from '../../src/infrastructure/web/routes/review.routes.js';
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';
import { Review } from '../../src/domain/entities/Review.js';
import type { PrismaReviewRepository } from '../../src/infrastructure/persistence/PrismaReviewRepository.js';

vi.mock('../../src/infrastructure/messaging/RabbitMQPublisher.js', () => ({
  RabbitMQPublisher: vi.fn().mockImplementation(() => ({
    connect: vi.fn().mockResolvedValue(undefined),
    publish: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
  })),
}));

vi.mock('../../src/infrastructure/messaging/RabbitMQConsumer.js', () => ({
  RabbitMQConsumer: vi.fn().mockImplementation(() => ({
    start: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn().mockResolvedValue(undefined),
  })),
}));

describe('Review Flow Integration', () => {
  let app: FastifyInstance;
  const tenantId = 'tenant-test-123';
  const reviewerId = 'reviewer-test-123';
  const documentId = 'doc-test-123';
  const reviewId = 'rev-1';
  let mockReviewRepo: Mocked<PrismaReviewRepository>;

  beforeAll(async () => {
    app = Fastify({ logger: false });

    app.setValidatorCompiler(validatorCompiler);
    app.setSerializerCompiler(serializerCompiler);

    mockReviewRepo = {
      save: vi.fn(),
      findById: vi.fn(),
      findByDocumentId: vi.fn(),
      findPending: vi.fn(),
      findCompletedByReviewer: vi.fn(),
      getReviewerStats: vi.fn(),
      countPending: vi.fn(),
      countByPriority: vi.fn(),
    } as unknown as Mocked<PrismaReviewRepository>;

    const mockPublisher = {
      connect: async () => {},
      publish: async () => {},
      close: async () => {},
    };

    const getPendingReviews = new GetPendingReviews(mockReviewRepo);
    const getReviewDetail = new GetReviewDetail(mockReviewRepo);
    const submitReview = new SubmitReview(mockReviewRepo, mockPublisher);
    const getReviewerStats = new GetReviewerStats(mockReviewRepo);

    const controller = new ReviewController(
      getPendingReviews,
      getReviewDetail,
      submitReview,
      getReviewerStats
    );

    void app.register(reviewRoutes, { prefix: '/api/reviews', controller });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should list pending reviews', async () => {
    mockReviewRepo.findPending.mockResolvedValueOnce({
      success: true,
      data: [
        new Review({
          id: reviewId,
          tenantId,
          documentId,
          extractionId: 'ext-test-123',
          status: 'PENDING',
          priority: 'HIGH',
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
      ],
      meta: {
        total: 1,
        page: 1,
        limit: 20,
        hasMore: false,
      },
    });

    const response = await app.inject({
      method: 'GET',
      url: '/api/reviews/pending',
      headers: {
        'x-tenant-id': tenantId,
        'x-user-id': reviewerId,
        'x-user-role': 'REVIEWER',
      },
    });

    expect(response.statusCode).toBe(200);
    const data = JSON.parse(response.payload);
    expect(data.items).toBeInstanceOf(Array);
    expect(data.items.length).toBeGreaterThan(0);
    expect(data.items[0].id).toBe(reviewId);
  });

  it('should submit an approval action', async () => {
    const review = new Review({
      id: reviewId,
      tenantId,
      documentId,
      extractionId: 'ext-test-123',
      status: 'PENDING',
      priority: 'HIGH',
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
    review.startReview(reviewerId);
    mockReviewRepo.findById.mockResolvedValueOnce(review);

    const response = await app.inject({
      method: 'POST',
      url: `/api/reviews/${reviewId}/action`,
      headers: {
        'x-tenant-id': tenantId,
        'x-user-id': reviewerId,
        'x-user-role': 'REVIEWER',
      },
      payload: {
        action: 'APPROVED',
        durationMs: 12000,
      },
    });

    expect(response.statusCode).toBe(200);
    const data = JSON.parse(response.payload);
    expect(data.status).toBe('COMPLETED');
    expect(data.action).toBe('APPROVED');
    expect(mockReviewRepo.save).toHaveBeenCalled();
  });

  it('should return 404 for cross-tenant access', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/api/reviews/${reviewId}`,
      headers: {
        'x-tenant-id': 'different-tenant-456',
        'x-user-id': reviewerId,
        'x-user-role': 'REVIEWER',
      },
    });

    expect(response.statusCode).toBe(404);
  });
});
