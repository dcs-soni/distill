import { PrismaClient } from '../../infrastructure/persistence/generated/client/index.js';

export interface AccuracyDataPoint {
  date: string;
  accuracy: number;
}

export interface AccuracyReportResult {
  overallAccuracy: number;
  accuracyOverTime: AccuracyDataPoint[];
  byDocType: Record<string, number>;
  byProvider: Record<string, number>;
}

export class GetAccuracyReport {
  constructor(private readonly prisma: PrismaClient) {}

  async execute(tenantId: string): Promise<AccuracyReportResult> {
    const overallAgg = await this.prisma.documentMetrics.aggregate({
      where: { tenantId, extractionConfidence: { not: null } },
      _avg: { extractionConfidence: true },
    });

    const byDocTypeAgg = await this.prisma.documentMetrics.groupBy({
      by: ['docType'],
      where: { tenantId, extractionConfidence: { not: null }, docType: { not: null } },
      _avg: { extractionConfidence: true },
    });

    const byProviderAgg = await this.prisma.documentMetrics.groupBy({
      by: ['aiProvider'],
      where: { tenantId, extractionConfidence: { not: null }, aiProvider: { not: null } },
      _avg: { extractionConfidence: true },
    });

    // Postgres date_trunc would be better, but Prisma groupBy on timestamp directly is limited.
    // We fetch and group manually for simplicity in this microservice layer.
    const allConfidenceMetrics = await this.prisma.documentMetrics.findMany({
      where: { tenantId, extractionConfidence: { not: null } },
      select: { timestamp: true, extractionConfidence: true },
      orderBy: { timestamp: 'asc' },
    });

    const timeSeriesMap = new Map<string, { sum: number; count: number }>();
    for (const metric of allConfidenceMetrics) {
      const dateStr = metric.timestamp.toISOString().split('T')[0];
      const current = timeSeriesMap.get(dateStr) || { sum: 0, count: 0 };
      timeSeriesMap.set(dateStr, {
        sum: current.sum + metric.extractionConfidence!,
        count: current.count + 1,
      });
    }

    const accuracyOverTime: AccuracyDataPoint[] = [];
    for (const [date, data] of timeSeriesMap.entries()) {
      accuracyOverTime.push({ date, accuracy: data.sum / data.count });
    }

    const byDocType: Record<string, number> = {};
    byDocTypeAgg.forEach((g) => {
      if (g.docType) byDocType[g.docType] = g._avg.extractionConfidence!;
    });

    const byProvider: Record<string, number> = {};
    byProviderAgg.forEach((g) => {
      if (g.aiProvider) byProvider[g.aiProvider] = g._avg.extractionConfidence!;
    });

    return {
      overallAccuracy: overallAgg._avg.extractionConfidence || 0,
      accuracyOverTime,
      byDocType,
      byProvider,
    };
  }
}
