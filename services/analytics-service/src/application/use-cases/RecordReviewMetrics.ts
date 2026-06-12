import { PrismaClient } from '../../infrastructure/persistence/generated/client/index.js';
import { randomUUID } from 'crypto';

interface ReviewMetricsPayload {
  tenantId: string;
  reviewerId: string;
  documentId: string;
  action: string;
  correctionsCount: number;
  durationMs: number;
}

export class RecordReviewMetrics {
  constructor(private readonly prisma: PrismaClient) {}

  async execute(payload: ReviewMetricsPayload): Promise<void> {
    await this.prisma.reviewMetrics.create({
      data: {
        id: randomUUID(),
        tenantId: payload.tenantId,
        reviewerId: payload.reviewerId,
        documentId: payload.documentId,
        timestamp: new Date(),
        action: payload.action,
        correctionsCount: payload.correctionsCount,
        durationMs: payload.durationMs,
      },
    });
  }
}
