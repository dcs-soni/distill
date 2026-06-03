import { NotFoundError, ConflictError, ForbiddenError, ValidationError } from '@distill/utils';
import type { Correction } from '@distill/types';
import type { ReviewRepository } from '../ports/ReviewRepository.port.js';
import type { EventPublisher } from '../ports/EventPublisher.port.js';
import { createReviewCompletedEvent } from '../../domain/events/ReviewCompleted.js';

export class SubmitReview {
  constructor(
    private readonly reviewRepository: ReviewRepository,
    private readonly publisher: EventPublisher
  ) {}

  async execute(params: {
    tenantId: string;
    reviewId: string;
    reviewerId: string;
    action: 'APPROVED' | 'CORRECTED' | 'REJECTED' | 'ESCALATED';
    corrections?: Correction[];
    notes?: string;
    durationMs: number;
  }) {
    const { tenantId, reviewId, reviewerId, action, corrections, notes, durationMs } = params;

    const review = await this.reviewRepository.findById(tenantId, reviewId);
    if (!review) {
      throw new NotFoundError('Review not found');
    }

    if (review.isCompleted()) {
      throw new ConflictError('Review is already completed');
    }

    // Usually we'd enforce the reviewerId to match, but if unassigned, we assign it now.
    if (review.reviewerId === null) {
      review.startReview(reviewerId);
    } else if (review.reviewerId !== reviewerId) {
      throw new ForbiddenError('Review is assigned to another reviewer');
    }

    switch (action) {
      case 'APPROVED':
        review.submitApproval(reviewerId, durationMs);
        break;
      case 'CORRECTED':
        if (!corrections || corrections.length === 0) {
          throw new ValidationError('Corrections are required for CORRECTED action');
        }
        review.submitCorrection(reviewerId, corrections, durationMs);
        break;
      case 'REJECTED':
        if (!notes) {
          throw new ValidationError('Notes are required for REJECTED action');
        }
        review.submitRejection(reviewerId, notes, durationMs);
        break;
      case 'ESCALATED':
        if (!notes) {
          throw new ValidationError('Notes are required for ESCALATED action');
        }
        review.escalate(reviewerId, notes, durationMs);
        break;
      default:
        throw new ValidationError('Invalid action');
    }

    await this.reviewRepository.save(review);

    // Only publish event if it's completed (ESCALATED goes back to queue, not completed)
    if (review.isCompleted()) {
      const event = createReviewCompletedEvent(
        review.tenantId,
        review.documentId,
        review.id,
        review.action!,
        review.corrections,
        review.id
      );

      const routingKey = `review.completed.${action.toLowerCase()}`;
      await this.publisher.publish('review.exchange', routingKey, event);
    }

    return review.toDTO();
  }
}
