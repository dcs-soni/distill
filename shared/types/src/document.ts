import { DocumentId, TenantId, BatchId } from './common.js';

export type DocumentStatus =
  | 'QUEUED'
  | 'PROCESSING'
  | 'EXTRACTED'
  | 'VALIDATED'
  | 'REVIEW_NEEDED'
  | 'APPROVED'
  | 'REJECTED'
  | 'FAILED';

export type DocumentType =
  | 'ANNUAL_REPORT'
  | 'BALANCE_SHEET'
  | 'INCOME_STATEMENT'
  | 'INVOICE'
  | 'UNKNOWN';

export type ProcessingStage =
  | 'UPLOAD'
  | 'CLASSIFICATION'
  | 'EXTRACTION'
  | 'NORMALIZATION'
  | 'VALIDATION'
  | 'REVIEW';

export interface Document {
  id: DocumentId;
  tenantId: TenantId;
  batchId?: BatchId;
  fileName: string;
  mimeType: string;
  fileSize: number;
  s3Key: string;
  status: DocumentStatus;
  documentType: DocumentType;
  processingStage: ProcessingStage;
  uploadedAt: string;
  updatedAt: string;
}
