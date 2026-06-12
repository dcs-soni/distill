import { PrismaClient } from '../../infrastructure/persistence/generated/client/index.js';

export interface ReviewerStats {
  reviewerId: string;
  totalReviews: number;
  averageDurationMs: number;
  averageCorrections: number;
}

export interface ReviewerReportResult {
  stats: ReviewerStats[];
}

export class GetReviewerReport {
  constructor(private readonly prisma: PrismaClient) {}

  async execute(tenantId: string): Promise<ReviewerReportResult> {
    const reviewerAgg = await this.prisma.reviewMetrics.groupBy({
      by: ['reviewerId'],
      where: { tenantId },
      _count: { documentId: true },
      _avg: { durationMs: true, correctionsCount: true },
    });

    const stats: ReviewerStats[] = reviewerAgg.map((g) => ({
      reviewerId: g.reviewerId,
      totalReviews: g._count.documentId,
      averageDurationMs: g._avg.durationMs || 0,
      averageCorrections: g._avg.correctionsCount || 0,
    }));

    return { stats };
  }
}
