import { PrismaClient } from '../../infrastructure/persistence/generated/client/index.js';

export interface CostReportResult {
  totalCost: number;
  monthlyBurnRate: number;
  costByDocType: Record<string, number>;
  costByProvider: Record<string, number>;
  costByTenant?: Record<string, number>; // Only if admin view
}

export class GetCostReport {
  constructor(private readonly prisma: PrismaClient) {}

  async execute(tenantId: string): Promise<CostReportResult> {
    const overallAgg = await this.prisma.documentMetrics.aggregate({
      where: { tenantId, costUsd: { not: null } },
      _sum: { costUsd: true },
    });

    const byDocTypeAgg = await this.prisma.documentMetrics.groupBy({
      by: ['docType'],
      where: { tenantId, costUsd: { not: null }, docType: { not: null } },
      _sum: { costUsd: true },
    });

    const byProviderAgg = await this.prisma.documentMetrics.groupBy({
      by: ['aiProvider'],
      where: { tenantId, costUsd: { not: null }, aiProvider: { not: null } },
      _sum: { costUsd: true },
    });

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthAgg = await this.prisma.documentMetrics.aggregate({
      where: { tenantId, costUsd: { not: null }, timestamp: { gte: startOfMonth } },
      _sum: { costUsd: true },
    });

    const costByDocType: Record<string, number> = {};
    byDocTypeAgg.forEach((g) => {
      if (g.docType) costByDocType[g.docType] = g._sum.costUsd!;
    });

    const costByProvider: Record<string, number> = {};
    byProviderAgg.forEach((g) => {
      if (g.aiProvider) costByProvider[g.aiProvider] = g._sum.costUsd!;
    });

    return {
      totalCost: overallAgg._sum.costUsd || 0,
      monthlyBurnRate: monthAgg._sum.costUsd || 0,
      costByDocType,
      costByProvider,
    };
  }
}
