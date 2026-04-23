import { generateId } from '@distill/utils';
import { ValidationError } from '@distill/utils';
import { Document } from '../../domain/entities/Document.js';
import { DocumentStatus } from '../../domain/value-objects/DocumentStatus.js';
import { FileName, FileSize, MimeType } from '../../domain/value-objects/FileProperties.js';
import { createDocumentUploadedEvent } from '../../domain/events/DocumentUploaded.js';
import type { DocumentRepository } from '../ports/DocumentRepository.port.js';
import type { ObjectStorage } from '../ports/ObjectStorage.port.js';
import type { EventPublisher } from '../ports/EventPublisher.port.js';
import type { UploadDocumentInput } from '../dto/index.js';

const PDF_MAGIC_BYTES = Buffer.from([0x25, 0x50, 0x44, 0x46]); // %PDF

export class UploadDocument {
  constructor(
    private readonly documentRepo: DocumentRepository,
    private readonly storage: ObjectStorage,
    private readonly publisher: EventPublisher
  ) {}

  async execute(input: UploadDocumentInput, fileBuffer: Buffer): Promise<Record<string, unknown>> {
    this.validateMagicBytes(fileBuffer);

    const documentId = generateId();
    const fileName = new FileName(input.fileName);
    const mimeType = new MimeType(input.mimeType);
    const fileSize = new FileSize(input.fileSize);

    const s3Key = await this.storage.uploadFile(
      input.tenantId,
      documentId,
      fileName.value,
      fileBuffer,
      mimeType.value
    );

    const now = new Date();
    const document = new Document({
      id: documentId,
      tenantId: input.tenantId,
      fileName,
      mimeType,
      fileSize,
      s3Key,
      status: new DocumentStatus('QUEUED'),
      uploadedById: input.uploadedById,
      retryCount: 0,
      createdAt: now,
      updatedAt: now,
    });

    try {
      await this.documentRepo.save(document);
    } catch (err) {
      await this.storage.deleteFile(s3Key);
      throw err;
    }

    const event = createDocumentUploadedEvent(
      {
        documentId,
        tenantId: input.tenantId,
        s3Key,
        fileName: fileName.value,
        mimeType: mimeType.value,
        fileSize: fileSize.value,
        uploadedById: input.uploadedById,
      },
      documentId
    );

    await this.publisher.publish('document.exchange', 'document.uploaded.pdf', event);

    return document.toDTO();
  }

  private validateMagicBytes(buffer: Buffer): void {
    if (buffer.length < 4) {
      throw new ValidationError('File too small to be a valid PDF');
    }
    const header = buffer.subarray(0, 4);
    if (!header.equals(PDF_MAGIC_BYTES)) {
      throw new ValidationError('File is not a valid PDF (magic bytes check failed)');
    }
  }
}
