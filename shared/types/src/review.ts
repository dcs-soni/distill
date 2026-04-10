import { ReviewId, TenantId, DocumentId, UserId } from './common.js';

export type ReviewAction = 'APPROVED' | 'CORRECTED' | 'REJECTED' | 'ESCALATED';

export interface Correction {
  field: string;
  originalValue: unknown;
  correctedValue: unknown;
}

export interface Review {
  id: ReviewId;
  tenantId: TenantId;
  documentId: DocumentId;
  reviewerId: UserId;
  action: ReviewAction;
  corrections: Correction[];
  notes?: string;
  durationMs: number;
  createdAt: string;
}
