import type { PaginatedResponse, Correction, ReviewAction } from '@distill/types';
import type { Prisma, Review as PrismaReview } from '@prisma/client';
import { Review } from '../../domain/entities/Review.js';
import type { ReviewPriority } from '../../domain/value-objects/ReviewPriority.js';
import type {
  ReviewRepository,
  PendingReviewOptions,
  PaginationOptions,
  ReviewerStats,
} from '../../application/ports/ReviewRepository.port.js';
import { prisma } from './prismaClient.js';

export class PrismaReviewRepository implements ReviewRepository {
  async save(review: Review): Promise<void> {
    const data = review.toDTO();
    await prisma.review.upsert({
      where: {
        id: data.id,
      },
      create: {
        id: data.id,
        tenantId: data.tenantId,
        documentId: data.documentId,
        extractionId: data.extractionId,
        status: data.status,
        priority: data.priority,
        reviewerId: data.reviewerId,
        action: data.action,
        corrections: data.corrections as object,
        notes: data.notes,
        durationMs: data.durationMs,
        assignedAt: data.assignedAt,
        completedAt: data.completedAt,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      },
      update: {
        status: data.status,
        priority: data.priority,
        reviewerId: data.reviewerId,
        action: data.action,
        corrections: data.corrections as object,
        notes: data.notes,
        durationMs: data.durationMs,
        assignedAt: data.assignedAt,
        completedAt: data.completedAt,
        updatedAt: data.updatedAt,
      },
    });
  }

  async findById(tenantId: string, id: string): Promise<Review | null> {
    const record = await prisma.review.findFirst({
      where: {
        id,
        tenantId,
      },
    });

    if (!record) return null;
    return this.mapToDomain(record);
  }

  async findByDocumentId(tenantId: string, documentId: string): Promise<Review | null> {
    const record = await prisma.review.findFirst({
      where: {
        documentId,
        tenantId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!record) return null;
    return this.mapToDomain(record);
  }

  async findPending(
    tenantId: string,
    options: PendingReviewOptions
  ): Promise<PaginatedResponse<Review>> {
    const where: Prisma.ReviewWhereInput = {
      tenantId,
      status: 'PENDING',
    };

    if (options.priority) {
      where.priority = options.priority;
    }
    // We'd add docType if it was stored directly, but since we rely on the document service for that info,
    // a real implementation might need to join or fetch docs. For now, we filter what we can at DB level.

    let orderBy: Prisma.ReviewOrderByWithRelationInput | Prisma.ReviewOrderByWithRelationInput[] =
      {};
    if (options.sortBy === 'createdAt') {
      orderBy = { createdAt: 'desc' };
    } else {
      // Default to priority ordering: ESCALATED > HIGH > NORMAL
      // In Prisma, we can't easily order by enum values in specific order unless mapped correctly.
      // Assuming alphabetical: ESCALATED (E), HIGH (H), NORMAL (N).
      // So DESC will give NORMAL > HIGH > ESCALATED (which is wrong).
      // A common trick is to query them separately or sort in memory if the dataset is small enough,
      // or we can sort by createdAt for now if priority sorting is complex in Prisma without raw SQL.
      orderBy = [{ priority: 'asc' }, { createdAt: 'asc' }];
    }

    const skip = (options.page - 1) * options.limit;

    const [records, total] = await Promise.all([
      prisma.review.findMany({
        where,
        orderBy,
        skip,
        take: options.limit,
      }),
      prisma.review.count({ where }),
    ]);

    return {
      success: true,
      data: records.map((r) => this.mapToDomain(r)),
      meta: {
        total,
        page: options.page,
        limit: options.limit,
        hasMore: skip + options.limit < total,
      },
    };
  }

  async findCompletedByReviewer(
    tenantId: string,
    reviewerId: string,
    options: PaginationOptions
  ): Promise<PaginatedResponse<Review>> {
    const where = {
      tenantId,
      reviewerId,
      status: 'COMPLETED',
    };

    const skip = (options.page - 1) * options.limit;

    const [records, total] = await Promise.all([
      prisma.review.findMany({
        where,
        orderBy: { completedAt: 'desc' },
        skip,
        take: options.limit,
      }),
      prisma.review.count({ where }),
    ]);

    return {
      success: true,
      data: records.map((r) => this.mapToDomain(r)),
      meta: {
        total,
        page: options.page,
        limit: options.limit,
        hasMore: skip + options.limit < total,
      },
    };
  }

  async getReviewerStats(tenantId: string, reviewerId: string): Promise<ReviewerStats> {
    const where = {
      tenantId,
      ...(reviewerId ? { reviewerId } : {}),
      status: 'COMPLETED',
    };

    const records = await prisma.review.findMany({
      where,
      select: {
        action: true,
        durationMs: true,
        completedAt: true,
      },
    });

    const totalCompleted = records.length;
    if (totalCompleted === 0) {
      return {
        totalCompleted: 0,
        avgDurationMs: 0,
        approvalRate: 0,
        correctionRate: 0,
        rejectionRate: 0,
        last7Days: 0,
      };
    }

    let sumDuration = 0;
    let approved = 0;
    let corrected = 0;
    let rejected = 0;
    let last7DaysCount = 0;

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    for (const r of records) {
      if (r.durationMs) sumDuration += r.durationMs;
      if (r.action === 'APPROVED') approved++;
      if (r.action === 'CORRECTED') corrected++;
      if (r.action === 'REJECTED') rejected++;

      if (r.completedAt && r.completedAt >= sevenDaysAgo) {
        last7DaysCount++;
      }
    }

    return {
      totalCompleted,
      avgDurationMs: Math.round(sumDuration / totalCompleted),
      approvalRate: totalCompleted > 0 ? approved / totalCompleted : 0,
      correctionRate: totalCompleted > 0 ? corrected / totalCompleted : 0,
      rejectionRate: totalCompleted > 0 ? rejected / totalCompleted : 0,
      last7Days: last7DaysCount,
    };
  }

  async countPending(tenantId: string): Promise<number> {
    return prisma.review.count({
      where: {
        tenantId,
        status: 'PENDING',
      },
    });
  }

  async countByPriority(tenantId: string): Promise<Record<string, number>> {
    const result = await prisma.review.groupBy({
      by: ['priority'],
      where: {
        tenantId,
        status: 'PENDING',
      },
      _count: {
        id: true,
      },
    });

    const breakdown: Record<string, number> = {
      NORMAL: 0,
      HIGH: 0,
      ESCALATED: 0,
    };

    for (const row of result) {
      breakdown[row.priority] = row._count.id;
    }

    return breakdown;
  }

  private mapToDomain(record: PrismaReview): Review {
    return new Review({
      id: record.id,
      tenantId: record.tenantId,
      documentId: record.documentId,
      extractionId: record.extractionId,
      status: record.status as 'PENDING' | 'IN_PROGRESS' | 'COMPLETED',
      priority: record.priority as ReviewPriority,
      reviewerId: record.reviewerId,
      action: record.action as ReviewAction | null,
      corrections: (record.corrections as unknown as Correction[]) || [],
      notes: record.notes,
      durationMs: record.durationMs,
      assignedAt: record.assignedAt,
      completedAt: record.completedAt,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }
}
