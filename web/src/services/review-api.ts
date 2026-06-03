import apiClient from './api-client';
import type { Review, ReviewAction, Correction } from '@distill/types';
import type { DocumentDTO } from '@/types';
import type { Extraction } from '@distill/types';

export interface PendingReviewOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  priority?: string;
}

export interface PaginatedReviews {
  items: Review[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ReviewDetail {
  review: Review;
  document: DocumentDTO;
  extraction: Extraction;
}

export interface ReviewerStats {
  totalCompleted: number;
  avgDurationMs: number;
  approvalRate: number;
  correctionRate: number;
  rejectionRate: number;
}

export const reviewApi = {
  getPending: async (params?: PendingReviewOptions): Promise<PaginatedReviews> => {
    const response = await apiClient.get<PaginatedReviews>('/reviews/pending', { params });
    return response.data;
  },

  getDetail: async (id: string): Promise<ReviewDetail> => {
    const response = await apiClient.get<ReviewDetail>(`/reviews/${id}`);
    return response.data;
  },

  submitAction: async (
    id: string,
    body: {
      action: ReviewAction;
      corrections?: Correction[];
      notes?: string;
      durationMs: number;
    }
  ): Promise<Review> => {
    const response = await apiClient.post<Review>(`/reviews/${id}/action`, body);
    return response.data;
  },

  getStats: async (): Promise<ReviewerStats> => {
    const response = await apiClient.get<ReviewerStats>('/reviews/stats');
    return response.data;
  },
};
