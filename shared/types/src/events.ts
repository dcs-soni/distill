import { TenantId, DocumentId, ReviewId, ExtractionId } from './common.js';

export interface DomainEvent<T = Record<string, unknown>> {
  eventId: string;
  eventType: string;
  timestamp: string;
  tenantId: TenantId;
  correlationId?: string;
  payload: T;
}

export type DocumentUploadedEvent = DomainEvent<{
  documentId: DocumentId;
  fileName: string;
  s3Key: string;
  mimeType: string;
}>;

export type ExtractionCompletedEvent = DomainEvent<{
  documentId: DocumentId;
  extractionId: ExtractionId;
  status: 'SUCCESS' | 'PARTIAL' | 'FAILED';
  confidenceScore: number;
}>;

export type ValidationCompletedEvent = DomainEvent<{
  documentId: DocumentId;
  extractionId: ExtractionId;
  isValid: true;
  confidenceScore: number;
}>;

export type ValidationNeedsReviewEvent = DomainEvent<{
  documentId: DocumentId;
  extractionId: ExtractionId;
  reasons: string[];
  confidenceScore: number;
}>;

export type ReviewCompletedEvent = DomainEvent<{
  documentId: DocumentId;
  reviewId: ReviewId;
  action: 'APPROVED' | 'CORRECTED' | 'REJECTED' | 'ESCALATED';
}>;
