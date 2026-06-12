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
    reviewerId: string;
    durationMs?: number;
    correctionsCount?: number;
    docType?: string;
  };
}

export function createReviewCompletedEvent(
  tenantId: string,
  documentId: string,
  reviewId: string,
  action: ReviewAction,
  corrections?: Correction[],
  reviewerId?: string,
  durationMs?: number,
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
      reviewerId: reviewerId || 'unknown',
      durationMs,
      correctionsCount: corrections ? corrections.length : 0,
    },
  };
}
