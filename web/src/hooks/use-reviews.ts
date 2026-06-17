import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reviewApi, type PendingReviewOptions, type ReviewDetail } from '../services/review-api';
import type { ReviewAction, Correction } from '@distill/types';

export const reviewKeys = {
  all: ['reviews'] as const,
  pending: (options: PendingReviewOptions) => [...reviewKeys.all, 'pending', options] as const,
  detail: (id: string) => [...reviewKeys.all, 'detail', id] as const,
  stats: () => [...reviewKeys.all, 'stats'] as const,
};

export function usePendingReviews(options: PendingReviewOptions = {}) {
  return useQuery({
    queryKey: reviewKeys.pending(options),
    queryFn: () => reviewApi.getPending(options),
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}

export function useReviewDetail(id: string | undefined) {
  return useQuery({
    queryKey: reviewKeys.detail(id ?? ''),
    queryFn: () => reviewApi.getDetail(id ?? ''),
    enabled: !!id,
  });
}

export function useReviewerStats() {
  return useQuery({
    queryKey: reviewKeys.stats(),
    queryFn: () => reviewApi.getStats(),
  });
}

export function useSubmitReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body: {
        action: ReviewAction;
        corrections?: Correction[];
        notes?: string;
        durationMs: number;
      };
    }) => reviewApi.submitAction(id, body),
    onSuccess: async (updatedReview, variables) => {
      // Invalidate queries so that pending list and stats are updated
      await queryClient.invalidateQueries({ queryKey: reviewKeys.all });
      // Update the specific detail query
      queryClient.setQueryData(
        reviewKeys.detail(variables.id),
        (oldData: ReviewDetail | undefined) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            review: updatedReview,
          };
        }
      );
    },
  });
}
