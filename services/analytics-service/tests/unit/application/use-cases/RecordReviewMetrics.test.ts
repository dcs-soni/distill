import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RecordReviewMetrics } from '../../../../src/application/use-cases/RecordReviewMetrics.js';
import { PrismaClient } from '../../../../src/infrastructure/persistence/generated/client/index.js';

describe('RecordReviewMetrics', () => {
  let useCase: RecordReviewMetrics;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      reviewMetrics: {
        create: vi.fn().mockResolvedValue({}),
      },
    };
    useCase = new RecordReviewMetrics(mockPrisma as unknown as PrismaClient);
  });

  it('should create review metrics successfully', async () => {
    await useCase.execute({
      tenantId: 'tenant-123',
      reviewerId: 'reviewer-abc',
      documentId: 'doc-456',
      action: 'APPROVED',
      correctionsCount: 5,
      durationMs: 12000,
    });

    expect(mockPrisma.reviewMetrics.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tenantId: 'tenant-123',
          reviewerId: 'reviewer-abc',
          documentId: 'doc-456',
          action: 'APPROVED',
          correctionsCount: 5,
          durationMs: 12000,
        }),
      })
    );
  });
});
