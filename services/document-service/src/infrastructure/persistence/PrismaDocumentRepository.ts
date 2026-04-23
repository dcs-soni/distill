import type {
  DocumentRepository,
  DocumentFilter,
  PaginationOptions,
  PaginatedResult,
} from '../../application/ports/DocumentRepository.port.js';
import { Document } from '../../domain/entities/Document.js';
import { DocumentStatus } from '../../domain/value-objects/DocumentStatus.js';
import { FileName, FileSize, MimeType } from '../../domain/value-objects/FileProperties.js';
import { prisma } from './prismaClient.js';

type PrismaDocument = {
  id: string;
  tenantId: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  s3Key: string;
  status: string;
  documentType: string | null;
  pageCount: number | null;
  isScanned: boolean | null;
  uploadedById: string;
  batchId: string | null;
  retryCount: number;
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
};

function toDomain(row: PrismaDocument): Document {
  return new Document({
    id: row.id,
    tenantId: row.tenantId,
    fileName: new FileName(row.fileName),
    mimeType: new MimeType(row.mimeType),
    fileSize: new FileSize(row.fileSize),
    s3Key: row.s3Key,
    status: new DocumentStatus(row.status),
    documentType: row.documentType ?? undefined,
    pageCount: row.pageCount ?? undefined,
    isScanned: row.isScanned ?? undefined,
    uploadedById: row.uploadedById,
    batchId: row.batchId ?? undefined,
    retryCount: row.retryCount,
    errorMessage: row.errorMessage ?? undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
}

export class PrismaDocumentRepository implements DocumentRepository {
  async save(document: Document): Promise<void> {
    await prisma.document.upsert({
      where: { id: document.id },
      create: {
        id: document.id,
        tenantId: document.tenantId,
        fileName: document.fileName,
        mimeType: document.mimeType,
        fileSize: document.fileSize,
        s3Key: document.s3Key,
        status: document.status,
        documentType: document.documentType ?? null,
        pageCount: document.pageCount ?? null,
        isScanned: document.isScanned ?? null,
        uploadedById: document.uploadedById,
        batchId: document.batchId ?? null,
        retryCount: document.retryCount,
        errorMessage: document.errorMessage ?? null,
      },
      update: {
        status: document.status,
        documentType: document.documentType ?? null,
        pageCount: document.pageCount ?? null,
        isScanned: document.isScanned ?? null,
        retryCount: document.retryCount,
        errorMessage: document.errorMessage ?? null,
      },
    });
  }

  async findById(tenantId: string, id: string): Promise<Document | null> {
    const row = await prisma.document.findFirst({
      where: { id, tenantId },
    });
    return row ? toDomain(row) : null;
  }

  async findByS3Key(s3Key: string): Promise<Document | null> {
    const row = await prisma.document.findUnique({
      where: { s3Key },
    });
    return row ? toDomain(row) : null;
  }

  async findAll(
    tenantId: string,
    filter: DocumentFilter,
    pagination: PaginationOptions
  ): Promise<PaginatedResult<Document>> {
    const where: Record<string, unknown> = { tenantId };

    if (filter.status) where.status = filter.status;
    if (filter.documentType) where.documentType = filter.documentType;
    if (filter.batchId) where.batchId = filter.batchId;
    if (filter.search) {
      where.fileName = { contains: filter.search, mode: 'insensitive' };
    }
    if (filter.dateFrom || filter.dateTo) {
      const dateFilter: Record<string, Date> = {};
      if (filter.dateFrom) dateFilter.gte = filter.dateFrom;
      if (filter.dateTo) dateFilter.lte = filter.dateTo;
      where.createdAt = dateFilter;
    }

    const [data, total] = await Promise.all([
      prisma.document.findMany({
        where,
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
        orderBy: {
          [pagination.sortBy || 'createdAt']: pagination.sortOrder || 'desc',
        },
      }),
      prisma.document.count({ where }),
    ]);

    return {
      data: data.map(toDomain),
      total,
      page: pagination.page,
      limit: pagination.limit,
      totalPages: Math.ceil(total / pagination.limit),
    };
  }

  async updateStatus(
    tenantId: string,
    id: string,
    status: string,
    updates?: Record<string, unknown>
  ): Promise<void> {
    await prisma.document.updateMany({
      where: { id, tenantId },
      data: { status, ...updates },
    });
  }

  async delete(tenantId: string, id: string): Promise<void> {
    await prisma.document.deleteMany({
      where: { id, tenantId },
    });
  }

  async countByTenantAndStatus(tenantId: string, status: string): Promise<number> {
    return prisma.document.count({
      where: { tenantId, status },
    });
  }
}
