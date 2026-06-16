import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GetCostReport } from '../../../../src/application/use-cases/GetCostReport.js';

describe('GetCostReport', () => {
  let prismaMock: any;
  let useCase: GetCostReport;

  beforeEach(() => {
    prismaMock = {
      documentMetrics: {
        aggregate: vi.fn(),
        groupBy: vi.fn(),
        findMany: vi.fn(),
      },
    };
    useCase = new GetCostReport(prismaMock);
  });

  it('should generate cost report correctly', async () => {
    prismaMock.documentMetrics.aggregate.mockResolvedValueOnce({
      _sum: { costUsd: 150.5 },
    }); // overall

    prismaMock.documentMetrics.groupBy.mockResolvedValueOnce([
      { docType: 'invoice', _sum: { costUsd: 100 } },
      { docType: 'receipt', _sum: { costUsd: 50.5 } },
    ]); // docType

    prismaMock.documentMetrics.groupBy.mockResolvedValueOnce([
      { aiProvider: 'openai', _sum: { costUsd: 150.5 } },
    ]); // provider

    prismaMock.documentMetrics.aggregate.mockResolvedValueOnce({
      _sum: { costUsd: 40.0 },
    }); // monthly burn rate

    const testDate = new Date('2023-10-01T10:00:00Z');
    prismaMock.documentMetrics.findMany.mockResolvedValueOnce([
      { timestamp: testDate, costUsd: 10, aiProvider: 'openai' },
      { timestamp: testDate, costUsd: 5, aiProvider: 'anthropic' },
    ]); // allCostMetrics

    const result = await useCase.execute('tenant-1');

    expect(prismaMock.documentMetrics.aggregate).toHaveBeenCalledTimes(2);
    expect(prismaMock.documentMetrics.groupBy).toHaveBeenCalledTimes(2);

    expect(result.totalCost).toBe(150.5);
    expect(result.monthlyBurnRate).toBe(40.0);
    expect(result.costByDocType['invoice']).toBe(100);
    expect(result.costByProvider['openai']).toBe(150.5);
    expect(result.costOverTime).toHaveLength(1);
    expect(result.costOverTime[0].date).toBe('2023-10-01');
    expect(result.costOverTime[0]['openai']).toBe(10);
    expect(result.costOverTime[0]['anthropic']).toBe(5);
    expect(result.costOverTime[0].total).toBe(15);
  });
});
