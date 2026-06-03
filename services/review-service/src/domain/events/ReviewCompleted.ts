import type {
  DomainEvent,
  TenantId,
  DocumentId,
  ReviewId,
  ReviewAction,
  Correction,
} from '@distill/types';
import { generateId } from '@distill/utils';

export interface ReviewCompletedEvent extends DomainEvent {
  eventType: 'review.completed';
  payload: {
    tenantId: TenantId;
    documentId: DocumentId;
    reviewId: ReviewId;
    action: ReviewAction;
    corrections?: Correction[];
  };
}

export function createReviewCompletedEvent(
  tenantId: string,
  documentId: string,
  reviewId: string,
  action: ReviewAction,
  corrections?: Correction[],
  correlationId?: string
): ReviewCompletedEvent {
  return {
    eventId: generateId(),
    eventType: 'review.completed',
    timestamp: new Date().toISOString(),
    tenantId: tenantId as TenantId,
    correlationId,
    payload: {
      tenantId: tenantId as TenantId,
      documentId: documentId as DocumentId,
      reviewId: reviewId as ReviewId,
      action,
      corrections,
    },
  };
}
