import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  ListDocuments,
  GetDocument,
  DeleteDocument,
} from '../../../src/application/use-cases/QueryDocuments.js';
import type { DocumentRepository } from '../../../src/application/ports/DocumentRepository.port.js';
import type { ObjectStorage } from '../../../src/application/ports/ObjectStorage.port.js';
import { Document } from '../../../src/domain/entities/Document.js';
import { DocumentStatus } from '../../../src/domain/value-objects/DocumentStatus.js';
import { FileName, FileSize, MimeType } from '../../../src/domain/value-objects/FileProperties.js';

function createTestDocument(overrides: Partial<Record<string, unknown>> = {}): Document {
  const now = new Date();
  return new Document({
    id: 'doc-1',
    tenantId: 'tenant-1',
    fileName: new FileName('report.pdf'),
    mimeType: new MimeType('application/pdf'),
    fileSize: new FileSize(2048),
    s3Key: 'tenant-1/documents/doc-1/report.pdf',
    status: new DocumentStatus('QUEUED'),
    uploadedById: 'user-1',
    retryCount: 0,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  });
}

function createMockRepo(): DocumentRepository {
  return {
    save: vi.fn().mockResolvedValue(undefined),
    findById: vi.fn().mockResolvedValue(null),
    findByS3Key: vi.fn().mockResolvedValue(null),
    findAll: vi.fn().mockResolvedValue({
      data: [],
      total: 0,
      page: 1,
      limit: 20,
      totalPages: 0,
    }),
    updateStatus: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
    countByTenantAndStatus: vi.fn().mockResolvedValue(0),
  };
}

function createMockStorage(): ObjectStorage {
  return {
    uploadFile: vi.fn().mockResolvedValue('key'),
    downloadFile: vi.fn().mockResolvedValue(null as any),
    getPresignedUploadUrl: vi.fn().mockResolvedValue('https://upload'),
    getPresignedDownloadUrl: vi.fn().mockResolvedValue('https://download/presigned'),
    deleteFile: vi.fn().mockResolvedValue(undefined),
  };
}

describe('ListDocuments Use Case', () => {
  let repo: DocumentRepository;
  let useCase: ListDocuments;

  beforeEach(() => {
    repo = createMockRepo();
    useCase = new ListDocuments(repo);
  });

  it('returns paginated documents', async () => {
    const docs = [createTestDocument(), createTestDocument({ id: 'doc-2' })];
    (repo.findAll as any).mockResolvedValue({
      data: docs,
      total: 2,
      page: 1,
      limit: 20,
      totalPages: 1,
    });

    const result = await useCase.execute({
      tenantId: 'tenant-1',
      page: 1,
      limit: 20,
    });

    expect(result.data).toHaveLength(2);
    expect(result.total).toBe(2);
    expect(result.page).toBe(1);
    expect(result.totalPages).toBe(1);
  });

  it('passes filters to repository', async () => {
    await useCase.execute({
      tenantId: 'tenant-1',
      page: 1,
      limit: 10,
      status: 'QUEUED',
      documentType: 'annual_report',
      search: 'financial',
    });

    expect(repo.findAll).toHaveBeenCalledWith(
      'tenant-1',
      expect.objectContaining({
        status: 'QUEUED',
        documentType: 'annual_report',
        search: 'financial',
      }),
      expect.objectContaining({
        page: 1,
        limit: 10,
      })
    );
  });

  it('passes sorting options to repository', async () => {
    await useCase.execute({
      tenantId: 'tenant-1',
      page: 1,
      limit: 20,
      sortBy: 'fileName',
      sortOrder: 'asc',
    });

    expect(repo.findAll).toHaveBeenCalledWith(
      'tenant-1',
      expect.anything(),
      expect.objectContaining({
        sortBy: 'fileName',
        sortOrder: 'asc',
      })
    );
  });

  it('converts date strings to Date objects for filters', async () => {
    await useCase.execute({
      tenantId: 'tenant-1',
      page: 1,
      limit: 20,
      dateFrom: '2026-01-01T00:00:00.000Z',
      dateTo: '2026-12-31T23:59:59.000Z',
    });

    expect(repo.findAll).toHaveBeenCalledWith(
      'tenant-1',
      expect.objectContaining({
        dateFrom: expect.any(Date),
        dateTo: expect.any(Date),
      }),
      expect.anything()
    );
  });

  it('serializes documents to DTOs', async () => {
    (repo.findAll as any).mockResolvedValue({
      data: [createTestDocument()],
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
    });

    const result = await useCase.execute({ tenantId: 'tenant-1', page: 1, limit: 20 });
    expect(result.data[0]).toHaveProperty('id');
    expect(result.data[0]).toHaveProperty('tenantId');
    expect(result.data[0]).toHaveProperty('status');
    expect(typeof result.data[0].createdAt).toBe('string');
  });
});

describe('GetDocument Use Case', () => {
  let repo: DocumentRepository;
  let storage: ObjectStorage;
  let useCase: GetDocument;

  beforeEach(() => {
    repo = createMockRepo();
    storage = createMockStorage();
    useCase = new GetDocument(repo, storage);
  });

  it('returns document with presigned download URL', async () => {
    (repo.findById as any).mockResolvedValue(createTestDocument());

    const result = await useCase.execute({ tenantId: 'tenant-1', documentId: 'doc-1' });

    expect((result as any).id).toBe('doc-1');
    expect(result.downloadUrl).toBe('https://download/presigned');
  });

  it('calls storage with correct s3Key', async () => {
    (repo.findById as any).mockResolvedValue(createTestDocument());

    await useCase.execute({ tenantId: 'tenant-1', documentId: 'doc-1' });

    expect(storage.getPresignedDownloadUrl).toHaveBeenCalledWith(
      'tenant-1/documents/doc-1/report.pdf'
    );
  });

  it('throws NotFoundError when document does not exist', async () => {
    (repo.findById as any).mockResolvedValue(null);

    await expect(
      useCase.execute({ tenantId: 'tenant-1', documentId: 'nonexistent' })
    ).rejects.toThrow('not found');
  });

  it('enforces tenant scoping via repository', async () => {
    await useCase.execute({ tenantId: 'tenant-2', documentId: 'doc-1' }).catch(() => {});

    expect(repo.findById).toHaveBeenCalledWith('tenant-2', 'doc-1');
  });
});

describe('DeleteDocument Use Case', () => {
  let repo: DocumentRepository;
  let storage: ObjectStorage;
  let useCase: DeleteDocument;

  beforeEach(() => {
    repo = createMockRepo();
    storage = createMockStorage();
    useCase = new DeleteDocument(repo, storage);
  });

  it('deletes document when user is ADMIN', async () => {
    (repo.findById as any).mockResolvedValue(createTestDocument());

    await useCase.execute('tenant-1', 'doc-1', 'ADMIN');

    expect(storage.deleteFile).toHaveBeenCalledWith('tenant-1/documents/doc-1/report.pdf');
    expect(repo.delete).toHaveBeenCalledWith('tenant-1', 'doc-1');
  });

  it('rejects delete when user is not ADMIN', async () => {
    await expect(useCase.execute('tenant-1', 'doc-1', 'VIEWER')).rejects.toThrow('ADMIN');
  });

  it('rejects delete when user is REVIEWER', async () => {
    await expect(useCase.execute('tenant-1', 'doc-1', 'REVIEWER')).rejects.toThrow('ADMIN');
  });

  it('throws NotFoundError when document does not exist', async () => {
    (repo.findById as any).mockResolvedValue(null);

    await expect(useCase.execute('tenant-1', 'nonexistent', 'ADMIN')).rejects.toThrow('not found');
  });

  it('deletes S3 file before removing DB record', async () => {
    (repo.findById as any).mockResolvedValue(createTestDocument());

    await useCase.execute('tenant-1', 'doc-1', 'ADMIN');

    const deleteS3Order = (storage.deleteFile as any).mock.invocationCallOrder[0];
    const deleteDbOrder = (repo.delete as any).mock.invocationCallOrder[0];
    expect(deleteS3Order).toBeLessThan(deleteDbOrder);
  });
});
