import type { PaginatedResponse } from '@distill/types';
import type { Review } from '../../domain/entities/Review.js';

export interface PendingReviewOptions {
  page: number;
  limit: number;
  priority?: string;
  docType?: string;
  sortBy?: 'priority' | 'createdAt' | 'confidence';
}

export interface PaginationOptions {
  page: number;
  limit: number;
}

export interface ReviewerStats {
  totalCompleted: number;
  avgDurationMs: number;
  approvalRate: number;
  correctionRate: number;
  rejectionRate: number;
  last7Days: number;
}

export interface ReviewRepository {
  save(review: Review): Promise<void>;
  findById(tenantId: string, id: string): Promise<Review | null>;
  findByDocumentId(tenantId: string, documentId: string): Promise<Review | null>;
  findPending(tenantId: string, options: PendingReviewOptions): Promise<PaginatedResponse<Review>>;
  findCompletedByReviewer(
    tenantId: string,
    reviewerId: string,
    options: PaginationOptions
  ): Promise<PaginatedResponse<Review>>;
  getReviewerStats(tenantId: string, reviewerId: string): Promise<ReviewerStats>;
  countPending(tenantId: string): Promise<number>;
  countByPriority(tenantId: string): Promise<Record<string, number>>;
}
