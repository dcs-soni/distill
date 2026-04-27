import type { BatchRepository } from '../../application/ports/BatchRepository.port.js';
import { Batch } from '../../domain/entities/Batch.js';
import type { BatchStatus } from '../../domain/entities/Batch.js';
import { prisma } from './prismaClient.js';

export class PrismaBatchRepository implements BatchRepository {
  async save(batch: Batch): Promise<void> {
    await prisma.batch.upsert({
      where: { id: batch.id },
      create: {
        id: batch.id,
        tenantId: batch.tenantId,
        name: batch.name,
        totalDocuments: batch.totalDocuments,
        processedCount: batch.processedCount,
        failedCount: batch.failedCount,
        status: batch.status,
        uploadedById: batch.uploadedById,
      },
      update: {
        processedCount: batch.processedCount,
        failedCount: batch.failedCount,
        status: batch.status,
      },
    });
  }

  async findById(tenantId: string, id: string): Promise<Batch | null> {
    const row = await prisma.batch.findFirst({
      where: { id, tenantId },
    });
    if (!row) return null;
    return new Batch({
      id: row.id,
      tenantId: row.tenantId,
      name: row.name,
      totalDocuments: row.totalDocuments,
      processedCount: row.processedCount,
      failedCount: row.failedCount,
      status: row.status as BatchStatus,
      uploadedById: row.uploadedById,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }
}
