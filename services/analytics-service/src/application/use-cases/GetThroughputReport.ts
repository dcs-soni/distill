import { PrismaClient } from '../../infrastructure/persistence/generated/client/index.js';

export interface ThroughputDataPoint {
  date: string;
  count: number;
}

export interface ThroughputReportResult {
  throughputOverTime: ThroughputDataPoint[];
}

export class GetThroughputReport {
  constructor(private readonly prisma: PrismaClient) {}

  async execute(tenantId: string): Promise<ThroughputReportResult> {
    const allMetrics = await this.prisma.documentMetrics.findMany({
      where: { tenantId },
      select: { timestamp: true, documentId: true },
      orderBy: { timestamp: 'asc' },
    });

    const timeSeriesMap = new Map<string, Set<string>>();

    for (const metric of allMetrics) {
      const dateStr = metric.timestamp.toISOString().split('T')[0];
      if (!timeSeriesMap.has(dateStr)) {
        timeSeriesMap.set(dateStr, new Set());
      }
      timeSeriesMap.get(dateStr)!.add(metric.documentId);
    }

    const throughputOverTime: ThroughputDataPoint[] = [];
    for (const [date, docsSet] of timeSeriesMap.entries()) {
      throughputOverTime.push({ date, count: docsSet.size });
    }

    return { throughputOverTime };
  }
}
