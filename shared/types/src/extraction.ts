import { ExtractionId, DocumentId, TenantId } from './common.js';

export interface FieldConfidence {
  value: unknown;
  confidence: number;
  sourcePage?: number;
  boundingBox?: [number, number, number, number];
}

export interface FinancialData {
  companyName: FieldConfidence;
  fiscalYear: FieldConfidence;
  revenue: FieldConfidence;
  netProfit: FieldConfidence;
  ebitda: FieldConfidence;
  totalAssets: FieldConfidence;
  totalLiabilities: FieldConfidence;
  currency: FieldConfidence;
}

export interface Extraction {
  id: ExtractionId;
  tenantId: TenantId;
  documentId: DocumentId;
  version: number;
  overallConfidence: number;
  providerUsed: string;
  modelUsed: string;
  promptVersion: string;
  processingTimeMs: number;
  tokenCount: number;
  costUsd: number;
  data: FinancialData;
  createdAt: string;
}

export interface ExtractionResult {
  extractionId: ExtractionId;
  documentId: DocumentId;
  status: 'SUCCESS' | 'PARTIAL' | 'FAILED';
  error?: string;
  data?: FinancialData;
}
