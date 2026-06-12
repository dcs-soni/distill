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

    const result = await useCase.execute('tenant-1');

    expect(prismaMock.documentMetrics.aggregate).toHaveBeenCalledTimes(2);
    expect(prismaMock.documentMetrics.groupBy).toHaveBeenCalledTimes(2);

    expect(result.totalCost).toBe(150.5);
    expect(result.monthlyBurnRate).toBe(40.0);
    expect(result.costByDocType['invoice']).toBe(100);
    expect(result.costByProvider['openai']).toBe(150.5);
  });
});
