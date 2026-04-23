import type { TenantId } from '@distill/types';
import type { DomainEvent } from '@distill/types';

export interface DocumentFailedPayload {
  documentId: string;
  tenantId: string;
  errorMessage: string;
  retryCount: number;
  stage: string;
}

export function createDocumentFailedEvent(
  payload: DocumentFailedPayload,
  correlationId: string
): DomainEvent<DocumentFailedPayload> {
  return {
    eventId: crypto.randomUUID(),
    eventType: 'document.failed',
    timestamp: new Date().toISOString(),
    tenantId: payload.tenantId as TenantId,
    correlationId,
    payload,
  };
}
