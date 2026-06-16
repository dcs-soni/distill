import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GetThroughputReport } from '../../../../src/application/use-cases/GetThroughputReport.js';

describe('GetThroughputReport', () => {
  let prismaMock: any;
  let useCase: GetThroughputReport;

  beforeEach(() => {
    prismaMock = {
      documentMetrics: {
        findMany: vi.fn(),
      },
    };
    useCase = new GetThroughputReport(prismaMock);
  });

  it('should generate throughput report correctly', async () => {
    const d1 = new Date('2023-10-01T10:00:00Z');
    const d2 = new Date('2023-10-02T10:00:00Z');

    prismaMock.documentMetrics.findMany.mockResolvedValueOnce([
      { timestamp: d1, documentId: 'doc-1' },
      { timestamp: d1, documentId: 'doc-2' },
      { timestamp: d2, documentId: 'doc-3' },
    ]);

    const result = await useCase.execute('tenant-1');

    expect(prismaMock.documentMetrics.findMany).toHaveBeenCalledTimes(1);
    expect(result.throughputOverTime).toHaveLength(2);
    expect(result.throughputOverTime[0].date).toBe('2023-10-01');
    expect(result.throughputOverTime[0].count).toBe(2);
    expect(result.throughputOverTime[1].date).toBe('2023-10-02');
    expect(result.throughputOverTime[1].count).toBe(1);
  });
});
