import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GetDashboardMetrics } from '../../../../src/application/use-cases/GetDashboardMetrics.js';

describe('GetDashboardMetrics', () => {
  let prismaMock: any;
  let useCase: GetDashboardMetrics;

  beforeEach(() => {
    prismaMock = {
      documentMetrics: {
        findMany: vi.fn(),
        groupBy: vi.fn(),
        aggregate: vi.fn(),
      },
    };
    useCase = new GetDashboardMetrics(prismaMock);
  });

  it('should calculate dashboard metrics correctly', async () => {
    prismaMock.documentMetrics.findMany.mockResolvedValue([
      { documentId: 'doc1' },
      { documentId: 'doc2' },
    ]);

    prismaMock.documentMetrics.groupBy.mockResolvedValue([
      { status: 'EXTRACTION_COMPLETED', _count: { documentId: 10 } },
      { status: 'FAILED', _count: { documentId: 2 } },
    ]);

    prismaMock.documentMetrics.aggregate.mockResolvedValue({
      _avg: {
        extractionConfidence: 0.95,
        extractionLatencyMs: 1200,
      },
    });

    const result = await useCase.execute('tenant-1');

    expect(prismaMock.documentMetrics.findMany).toHaveBeenCalledTimes(4);
    expect(prismaMock.documentMetrics.groupBy).toHaveBeenCalled();
    expect(prismaMock.documentMetrics.aggregate).toHaveBeenCalled();

    expect(result.totalDocuments.today).toBe(2);
    expect(result.statusDistribution['EXTRACTION_COMPLETED']).toBe(10);
    expect(result.statusDistribution['FAILED']).toBe(2);
    expect(result.averageConfidence).toBe(0.95);
    expect(result.averageProcessingTimeMs).toBe(1200);
    expect(result.successRate).toBeCloseTo(83.33); // 10 / 12
  });
});
