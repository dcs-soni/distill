import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UploadDocument } from '../../../src/application/use-cases/UploadDocument.js';
import type { DocumentRepository } from '../../../src/application/ports/DocumentRepository.port.js';
import type { ObjectStorage } from '../../../src/application/ports/ObjectStorage.port.js';
import type { EventPublisher } from '../../../src/application/ports/EventPublisher.port.js';

const PDF_HEADER = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]);
const NON_PDF_HEADER = Buffer.from([0x89, 0x50, 0x4e, 0x47]);

function createMockRepo(): DocumentRepository {
  return {
    save: vi.fn().mockResolvedValue(undefined),
    findById: vi.fn().mockResolvedValue(null),
    findByS3Key: vi.fn().mockResolvedValue(null),
    findAll: vi.fn().mockResolvedValue({ data: [], total: 0, page: 1, limit: 20, totalPages: 0 }),
    updateStatus: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
    countByTenantAndStatus: vi.fn().mockResolvedValue(0),
  };
}

function createMockStorage(): ObjectStorage {
  return {
    uploadFile: vi.fn().mockResolvedValue('tenant-1/documents/doc-1/report.pdf'),
    downloadFile: vi.fn().mockResolvedValue(null as any),
    getPresignedUploadUrl: vi.fn().mockResolvedValue('https://presigned-upload'),
    getPresignedDownloadUrl: vi.fn().mockResolvedValue('https://presigned-download'),
    deleteFile: vi.fn().mockResolvedValue(undefined),
  };
}

function createMockPublisher(): EventPublisher {
  return {
    publish: vi.fn().mockResolvedValue(true),
    connect: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
  };
}

describe('UploadDocument Use Case', () => {
  let repo: DocumentRepository;
  let storage: ObjectStorage;
  let publisher: EventPublisher;
  let useCase: UploadDocument;

  beforeEach(() => {
    repo = createMockRepo();
    storage = createMockStorage();
    publisher = createMockPublisher();
    useCase = new UploadDocument(repo, storage, publisher);
  });

  it('successfully uploads a valid PDF', async () => {
    const result = await useCase.execute(
      {
        tenantId: 'tenant-1',
        uploadedById: 'user-1',
        fileName: 'report.pdf',
        mimeType: 'application/pdf',
        fileSize: PDF_HEADER.length,
      },
      PDF_HEADER
    );

    expect(result).toBeDefined();
    expect(result.tenantId).toBe('tenant-1');
    expect(result.fileName).toBe('report.pdf');
    expect(result.status).toBe('QUEUED');
    expect(result.uploadedById).toBe('user-1');
    expect(result.retryCount).toBe(0);
  });

  it('uploads file to S3 before saving to DB', async () => {
    await useCase.execute(
      {
        tenantId: 'tenant-1',
        uploadedById: 'user-1',
        fileName: 'report.pdf',
        mimeType: 'application/pdf',
        fileSize: PDF_HEADER.length,
      },
      PDF_HEADER
    );

    expect(storage.uploadFile).toHaveBeenCalledOnce();
    expect(repo.save).toHaveBeenCalledOnce();

    const uploadCallOrder = (storage.uploadFile as any).mock.invocationCallOrder[0];
    const saveCallOrder = (repo.save as any).mock.invocationCallOrder[0];
    expect(uploadCallOrder).toBeLessThan(saveCallOrder);
  });

  it('publishes DocumentUploadedEvent after save', async () => {
    await useCase.execute(
      {
        tenantId: 'tenant-1',
        uploadedById: 'user-1',
        fileName: 'report.pdf',
        mimeType: 'application/pdf',
        fileSize: PDF_HEADER.length,
      },
      PDF_HEADER
    );

    expect(publisher.publish).toHaveBeenCalledWith(
      'document.exchange',
      'document.uploaded.pdf',
      expect.objectContaining({
        eventType: 'document.uploaded',
        tenantId: 'tenant-1',
        payload: expect.objectContaining({
          tenantId: 'tenant-1',
          fileName: 'report.pdf',
        }),
      })
    );
  });

  it('rejects non-PDF files by magic bytes', async () => {
    await expect(
      useCase.execute(
        {
          tenantId: 'tenant-1',
          uploadedById: 'user-1',
          fileName: 'image.png',
          mimeType: 'application/pdf',
          fileSize: NON_PDF_HEADER.length,
        },
        NON_PDF_HEADER
      )
    ).rejects.toThrow('not a valid PDF');
  });

  it('rejects files that are too small', async () => {
    const tinyBuffer = Buffer.from([0x25, 0x50]);

    await expect(
      useCase.execute(
        {
          tenantId: 'tenant-1',
          uploadedById: 'user-1',
          fileName: 'tiny.pdf',
          mimeType: 'application/pdf',
          fileSize: tinyBuffer.length,
        },
        tinyBuffer
      )
    ).rejects.toThrow('too small');
  });

  it('rolls back S3 file when DB save fails', async () => {
    (repo.save as any).mockRejectedValue(new Error('DB connection lost'));

    await expect(
      useCase.execute(
        {
          tenantId: 'tenant-1',
          uploadedById: 'user-1',
          fileName: 'report.pdf',
          mimeType: 'application/pdf',
          fileSize: PDF_HEADER.length,
        },
        PDF_HEADER
      )
    ).rejects.toThrow('DB connection lost');

    expect(storage.deleteFile).toHaveBeenCalledWith('tenant-1/documents/doc-1/report.pdf');
  });

  it('rejects invalid mime types at the value object level', async () => {
    await expect(
      useCase.execute(
        {
          tenantId: 'tenant-1',
          uploadedById: 'user-1',
          fileName: 'image.png',
          mimeType: 'image/png',
          fileSize: PDF_HEADER.length,
        },
        PDF_HEADER
      )
    ).rejects.toThrow('Invalid MIME type');
  });
});
