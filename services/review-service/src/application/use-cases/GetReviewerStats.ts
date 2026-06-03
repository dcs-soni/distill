import type { ReviewRepository } from '../ports/ReviewRepository.port.js';

export class GetReviewerStats {
  constructor(private readonly reviewRepository: ReviewRepository) {}

  async execute(tenantId: string, reviewerId: string) {
    return this.reviewRepository.getReviewerStats(tenantId, reviewerId);
  }
}
