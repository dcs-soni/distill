import { PrismaClient } from '../../infrastructure/persistence/generated/client/index.js';
import { randomUUID } from 'crypto';

interface DocumentMetricsPayload {
  tenantId: string;
  documentId: string;
  status: string;
  extractionConfidence?: number;
  extractionLatencyMs?: number;
  costUsd?: number;
  docType?: string;
  aiProvider?: string;
}

export class RecordDocumentMetrics {
  constructor(private readonly prisma: PrismaClient) {}

  async execute(payload: DocumentMetricsPayload): Promise<void> {
    await this.prisma.documentMetrics.create({
      data: {
        id: randomUUID(),
        tenantId: payload.tenantId,
        documentId: payload.documentId,
        timestamp: new Date(),
        status: payload.status,
        extractionConfidence: payload.extractionConfidence,
        extractionLatencyMs: payload.extractionLatencyMs,
        costUsd: payload.costUsd,
        docType: payload.docType,
        aiProvider: payload.aiProvider,
      },
    });
  }
}
