import { generateId, ValidationError } from '@distill/utils';
import { Batch } from '../../domain/entities/Batch.js';
import type { DocumentRepository } from '../ports/DocumentRepository.port.js';
import type { ObjectStorage } from '../ports/ObjectStorage.port.js';
import type { EventPublisher } from '../ports/EventPublisher.port.js';
import { UploadDocument } from './UploadDocument.js';
import type { UploadBatchInput } from '../dto/index.js';
import { prisma } from '../../infrastructure/persistence/prismaClient.js';

interface FileEntry {
  fileName: string;
  mimeType: string;
  fileSize: number;
  buffer: Buffer;
}

interface BatchResult {
  batch: Record<string, unknown>;
  succeeded: string[];
  failed: Array<{ fileName: string; error: string }>;
}

export class UploadBatch {
  private readonly uploadDocument: UploadDocument;

  constructor(
    private readonly documentRepo: DocumentRepository,
    private readonly storage: ObjectStorage,
    private readonly publisher: EventPublisher
  ) {
    this.uploadDocument = new UploadDocument(documentRepo, storage, publisher);
  }

  async execute(input: UploadBatchInput, files: FileEntry[]): Promise<BatchResult> {
    if (files.length === 0) {
      throw new ValidationError('Batch must contain at least 1 file');
    }
    if (files.length > 100) {
      throw new ValidationError('Batch cannot exceed 100 files');
    }

    const batchId = generateId();
    const now = new Date();

    const batch = new Batch({
      id: batchId,
      tenantId: input.tenantId,
      name: input.batchName,
      totalDocuments: files.length,
      processedCount: 0,
      failedCount: 0,
      status: 'PROCESSING',
      uploadedById: input.uploadedById,
      createdAt: now,
      updatedAt: now,
    });

    await prisma.batch.create({
      data: {
        id: batch.id,
        tenantId: batch.tenantId,
        name: batch.name,
        totalDocuments: batch.totalDocuments,
        processedCount: 0,
        failedCount: 0,
        status: 'PROCESSING',
        uploadedById: batch.uploadedById,
      },
    });

    const succeeded: string[] = [];
    const failed: Array<{ fileName: string; error: string }> = [];

    for (const file of files) {
      try {
        const result = await this.uploadDocument.execute(
          {
            tenantId: input.tenantId,
            uploadedById: input.uploadedById,
            fileName: file.fileName,
            mimeType: file.mimeType,
            fileSize: file.fileSize,
          },
          file.buffer
        );
        succeeded.push(result.id as string);
        batch.incrementProcessed();
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        failed.push({ fileName: file.fileName, error: errorMsg });
        batch.incrementFailed();
      }
    }

    await prisma.batch.update({
      where: { id: batchId },
      data: {
        processedCount: batch.processedCount,
        failedCount: batch.failedCount,
        status: batch.status,
      },
    });

    return {
      batch: batch.toDTO(),
      succeeded,
      failed,
    };
  }
}
