import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RecordDocumentMetrics } from '../../../../src/application/use-cases/RecordDocumentMetrics.js';
import { PrismaClient } from '../../../../src/infrastructure/persistence/generated/client/index.js';

describe('RecordDocumentMetrics', () => {
  let useCase: RecordDocumentMetrics;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      documentMetrics: {
        create: vi.fn().mockResolvedValue({}),
      },
    };
    useCase = new RecordDocumentMetrics(mockPrisma as unknown as PrismaClient);
  });

  it('should create document metrics successfully', async () => {
    await useCase.execute({
      tenantId: 'tenant-123',
      documentId: 'doc-456',
      status: 'EXTRACTION_COMPLETED',
      extractionConfidence: 0.95,
    });

    expect(mockPrisma.documentMetrics.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tenantId: 'tenant-123',
          documentId: 'doc-456',
          status: 'EXTRACTION_COMPLETED',
          extractionConfidence: 0.95,
        }),
      })
    );
  });
});
