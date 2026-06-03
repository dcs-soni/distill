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
  extractionId: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  priority: 'NORMAL' | 'HIGH' | 'ESCALATED';
  reviewerId: UserId | null;
  action: ReviewAction | null;
  corrections: Correction[];
  notes?: string | null;
  durationMs: number | null;
  assignedAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}
