import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GetAccuracyReport } from '../../../../src/application/use-cases/GetAccuracyReport.js';

describe('GetAccuracyReport', () => {
  let prismaMock: any;
  let useCase: GetAccuracyReport;

  beforeEach(() => {
    prismaMock = {
      documentMetrics: {
        aggregate: vi.fn(),
        groupBy: vi.fn(),
        findMany: vi.fn(),
      },
    };
    useCase = new GetAccuracyReport(prismaMock);
  });

  it('should generate accuracy report correctly', async () => {
    prismaMock.documentMetrics.aggregate.mockResolvedValue({
      _avg: { extractionConfidence: 0.88 },
    });

    prismaMock.documentMetrics.groupBy.mockResolvedValueOnce([
      { docType: 'invoice', _avg: { extractionConfidence: 0.9 } },
    ]);
    prismaMock.documentMetrics.groupBy.mockResolvedValueOnce([
      { aiProvider: 'openai', _avg: { extractionConfidence: 0.85 } },
    ]);

    prismaMock.documentMetrics.findMany.mockResolvedValue([
      { timestamp: new Date('2026-06-12T10:00:00Z'), extractionConfidence: 0.8 },
      { timestamp: new Date('2026-06-12T11:00:00Z'), extractionConfidence: 0.9 },
    ]);

    const result = await useCase.execute('tenant-1');

    expect(prismaMock.documentMetrics.aggregate).toHaveBeenCalled();
    expect(prismaMock.documentMetrics.groupBy).toHaveBeenCalledTimes(2);
    expect(prismaMock.documentMetrics.findMany).toHaveBeenCalled();

    expect(result.overallAccuracy).toBe(0.88);
    expect(result.byDocType['invoice']).toBe(0.9);
    expect(result.byProvider['openai']).toBe(0.85);
    expect(result.accuracyOverTime).toHaveLength(1);
    expect(result.accuracyOverTime[0].accuracy).toBeCloseTo(0.85); // (0.8 + 0.9) / 2
  });
});
