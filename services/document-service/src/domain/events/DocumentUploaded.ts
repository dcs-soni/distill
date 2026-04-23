import type { TenantId } from '@distill/types';
import type { DomainEvent } from '@distill/types';

export interface DocumentUploadedPayload {
  documentId: string;
  tenantId: string;
  s3Key: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  uploadedById: string;
  batchId?: string;
}

export function createDocumentUploadedEvent(
  payload: DocumentUploadedPayload,
  correlationId: string
): DomainEvent<DocumentUploadedPayload> {
  return {
    eventId: crypto.randomUUID(),
    eventType: 'document.uploaded',
    timestamp: new Date().toISOString(),
    tenantId: payload.tenantId as TenantId,
    correlationId,
    payload,
  };
}
