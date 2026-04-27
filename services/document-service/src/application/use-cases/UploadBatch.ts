import { generateId, ValidationError } from '@distill/utils';
import { Batch } from '../../domain/entities/Batch.js';
import type { DocumentRepository } from '../ports/DocumentRepository.port.js';
import type { ObjectStorage } from '../ports/ObjectStorage.port.js';
import type { EventPublisher } from '../ports/EventPublisher.port.js';
import { UploadDocument } from './UploadDocument.js';
import type { UploadBatchInput } from '../dto/index.js';
import AdmZip from 'adm-zip';
import type { BatchRepository } from '../ports/BatchRepository.port.js';

/** Must stay in sync with bootstrap.ts MAX_FILE_SIZE (50 MB). */
const MAX_ZIP_ENTRY_SIZE = 50 * 1024 * 1024;

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
    private readonly batchRepo: BatchRepository,
    private readonly storage: ObjectStorage,
    private readonly publisher: EventPublisher
  ) {
    this.uploadDocument = new UploadDocument(documentRepo, storage, publisher);
  }

  async execute(input: UploadBatchInput, files: FileEntry[]): Promise<BatchResult> {
    if (files.length === 0) {
      throw new ValidationError('Batch must contain at least 1 file');
    }

    const expandedFiles: FileEntry[] = [];
    for (const file of files) {
      if (file.mimeType === 'application/zip' || file.fileName.toLowerCase().endsWith('.zip')) {
        try {
          const zip = new AdmZip(file.buffer);
          const zipEntries = zip.getEntries();
          for (const entry of zipEntries) {
            if (!entry.isDirectory && entry.entryName.toLowerCase().endsWith('.pdf')) {
              const entrySize = entry.header.size;
              if (entrySize > MAX_ZIP_ENTRY_SIZE) {
                throw new ValidationError(
                  `ZIP entry "${entry.entryName}" exceeds the ${MAX_ZIP_ENTRY_SIZE / (1024 * 1024)} MB file size limit`
                );
              }
              // Strip directory components and sanitize to safe characters only.
              const baseName = entry.entryName.split('/').pop() || entry.entryName;
              const safeName = baseName.replace(/[^a-zA-Z0-9._-]/g, '_');
              expandedFiles.push({
                fileName: safeName,
                mimeType: 'application/pdf',
                fileSize: entrySize,
                buffer: entry.getData(),
              });
            }
          }
        } catch (err) {
          if (err instanceof ValidationError) throw err;
          throw new ValidationError(`Failed to process ZIP file "${file.fileName}"`);
        }
      } else {
        expandedFiles.push(file);
      }
    }

    if (expandedFiles.length === 0) {
      throw new ValidationError('Batch must contain at least 1 valid PDF file');
    }
    if (expandedFiles.length > 100) {
      throw new ValidationError('Batch cannot exceed 100 files after ZIP extraction');
    }

    const batchId = generateId();
    const now = new Date();

    const batch = new Batch({
      id: batchId,
      tenantId: input.tenantId,
      name: input.batchName,
      totalDocuments: expandedFiles.length,
      processedCount: 0,
      failedCount: 0,
      status: 'PROCESSING',
      uploadedById: input.uploadedById,
      createdAt: now,
      updatedAt: now,
    });

    await this.batchRepo.save(batch);

    const succeeded: string[] = [];
    const failed: Array<{ fileName: string; error: string }> = [];

    for (const file of expandedFiles) {
      try {
        const result = await this.uploadDocument.execute(
          {
            tenantId: input.tenantId,
            uploadedById: input.uploadedById,
            fileName: file.fileName,
            mimeType: file.mimeType,
            fileSize: file.fileSize,
            batchId: batchId,
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

    await this.batchRepo.save(batch);

    return {
      batch: batch.toDTO(),
      succeeded,
      failed,
    };
  }
}
