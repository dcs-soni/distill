import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../src/infrastructure/persistence/prismaClient.js', () => ({
  prisma: {
    batch: {
      create: vi.fn().mockResolvedValue({}),
      update: vi.fn().mockResolvedValue({}),
    },
  },
}));

import { UploadBatch } from '../../../src/application/use-cases/UploadBatch.js';
import type { DocumentRepository } from '../../../src/application/ports/DocumentRepository.port.js';
import type { ObjectStorage } from '../../../src/application/ports/ObjectStorage.port.js';
import type { EventPublisher } from '../../../src/application/ports/EventPublisher.port.js';

const PDF_HEADER = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]);

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
    uploadFile: vi.fn().mockResolvedValue('tenant-1/documents/doc-1/file.pdf'),
    downloadFile: vi.fn().mockResolvedValue(null as any),
    getPresignedUploadUrl: vi.fn().mockResolvedValue('https://presigned'),
    getPresignedDownloadUrl: vi.fn().mockResolvedValue('https://presigned'),
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

function createFileEntry(name = 'report.pdf') {
  return {
    fileName: name,
    mimeType: 'application/pdf',
    fileSize: PDF_HEADER.length,
    buffer: PDF_HEADER,
  };
}

describe('UploadBatch Use Case', () => {
  let repo: DocumentRepository;
  let storage: ObjectStorage;
  let publisher: EventPublisher;
  let useCase: UploadBatch;

  beforeEach(() => {
    vi.clearAllMocks();
    repo = createMockRepo();
    storage = createMockStorage();
    publisher = createMockPublisher();
    useCase = new UploadBatch(repo, storage, publisher);
  });

  it('successfully processes a batch of valid files', async () => {
    const files = [createFileEntry('a.pdf'), createFileEntry('b.pdf'), createFileEntry('c.pdf')];

    const result = await useCase.execute(
      { tenantId: 'tenant-1', uploadedById: 'user-1', batchName: 'Q4 Reports' },
      files
    );

    expect(result.succeeded).toHaveLength(3);
    expect(result.failed).toHaveLength(0);
    expect(result.batch.name).toBe('Q4 Reports');
    expect(result.batch.totalDocuments).toBe(3);
  });

  it('rejects empty batch', async () => {
    await expect(
      useCase.execute({ tenantId: 'tenant-1', uploadedById: 'user-1', batchName: 'Empty' }, [])
    ).rejects.toThrow('at least 1 file');
  });

  it('rejects batch exceeding 100 files', async () => {
    const files = Array.from({ length: 101 }, (_, i) => createFileEntry(`file-${i}.pdf`));

    await expect(
      useCase.execute(
        { tenantId: 'tenant-1', uploadedById: 'user-1', batchName: 'Too Many' },
        files
      )
    ).rejects.toThrow('exceed 100');
  });

  it('handles partial failures gracefully', async () => {
    const validFile = createFileEntry('good.pdf');
    const invalidFile = {
      fileName: 'bad.png',
      mimeType: 'image/png',
      fileSize: 100,
      buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47]),
    };

    const result = await useCase.execute(
      { tenantId: 'tenant-1', uploadedById: 'user-1', batchName: 'Mixed' },
      [validFile, invalidFile]
    );

    expect(result.succeeded.length).toBeGreaterThanOrEqual(1);
    expect(result.failed.length).toBeGreaterThanOrEqual(1);
    expect(result.failed[0].fileName).toBe('bad.png');
  });

  it('returns batch summary with correct counts', async () => {
    const result = await useCase.execute(
      { tenantId: 'tenant-1', uploadedById: 'user-1', batchName: 'Single' },
      [createFileEntry()]
    );

    expect(result.batch.processedCount).toBe(1);
    expect(result.batch.failedCount).toBe(0);
  });
});
