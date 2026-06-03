import type { ReviewRepository } from '../ports/ReviewRepository.port.js';

export class GetPendingReviews {
  constructor(private readonly reviewRepository: ReviewRepository) {}

  async execute(
    tenantId: string,
    page: number,
    limit: number,
    sortBy?: string,
    filterByPriority?: string
  ) {
    return this.reviewRepository.findPending(tenantId, {
      page,
      limit,
      sortBy: sortBy as 'createdAt' | 'priority' | undefined,
      priority: filterByPriority,
    });
  }
}
