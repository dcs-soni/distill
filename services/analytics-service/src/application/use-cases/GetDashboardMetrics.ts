import { PrismaClient } from '../../infrastructure/persistence/generated/client/index.js';

export interface DashboardMetricsResult {
  totalDocuments: {
    today: number;
    week: number;
    month: number;
    allTime: number;
  };
  statusDistribution: Record<string, number>;
  averageConfidence: number;
  averageProcessingTimeMs: number;
  successRate: number;
}

export class GetDashboardMetrics {
  constructor(private readonly prisma: PrismaClient) {}

  async execute(tenantId: string): Promise<DashboardMetricsResult> {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // 1. Total documents (distinct documentId)
    // Prisma count with distinct
    const countDocs = async (gte?: Date) => {
      const result = await this.prisma.documentMetrics.findMany({
        where: {
          tenantId,
          ...(gte ? { timestamp: { gte } } : {}),
        },
        distinct: ['documentId'],
        select: { documentId: true },
      });
      return result.length;
    };

    const [today, week, month, allTime] = await Promise.all([
      countDocs(startOfToday),
      countDocs(startOfWeek),
      countDocs(startOfMonth),
      countDocs(),
    ]);

    // 2. Status distribution
    const statusGroups = await this.prisma.documentMetrics.groupBy({
      by: ['status'],
      where: { tenantId },
      _count: { documentId: true },
    });

    const statusDistribution: Record<string, number> = {};
    let successCount = 0;
    let totalCount = 0;

    for (const group of statusGroups) {
      statusDistribution[group.status] = group._count.documentId;
      if (group.status === 'EXTRACTION_COMPLETED') {
        successCount += group._count.documentId;
      }
      totalCount += group._count.documentId;
    }

    const successRate = totalCount > 0 ? (successCount / totalCount) * 100 : 0;

    // 3. Average confidence and processing time
    const aggregates = await this.prisma.documentMetrics.aggregate({
      where: { tenantId },
      _avg: {
        extractionConfidence: true,
        extractionLatencyMs: true,
      },
    });

    return {
      totalDocuments: {
        today,
        week,
        month,
        allTime,
      },
      statusDistribution,
      averageConfidence: aggregates._avg.extractionConfidence || 0,
      averageProcessingTimeMs: aggregates._avg.extractionLatencyMs || 0,
      successRate,
    };
  }
}
