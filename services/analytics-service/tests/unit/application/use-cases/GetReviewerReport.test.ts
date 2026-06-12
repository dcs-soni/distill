import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GetReviewerReport } from '../../../../src/application/use-cases/GetReviewerReport.js';

describe('GetReviewerReport', () => {
  let prismaMock: any;
  let useCase: GetReviewerReport;

  beforeEach(() => {
    prismaMock = {
      reviewMetrics: {
        groupBy: vi.fn(),
      },
    };
    useCase = new GetReviewerReport(prismaMock);
  });

  it('should generate reviewer report correctly', async () => {
    prismaMock.reviewMetrics.groupBy.mockResolvedValue([
      {
        reviewerId: 'user-1',
        _count: { documentId: 15 },
        _avg: { durationMs: 5000, correctionsCount: 2.5 },
      },
    ]);

    const result = await useCase.execute('tenant-1');

    expect(prismaMock.reviewMetrics.groupBy).toHaveBeenCalled();
    expect(result.stats).toHaveLength(1);
    expect(result.stats[0]).toEqual({
      reviewerId: 'user-1',
      totalReviews: 15,
      averageDurationMs: 5000,
      averageCorrections: 2.5,
    });
  });
});
