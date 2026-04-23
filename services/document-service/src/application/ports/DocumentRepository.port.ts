import type { Document } from '../../domain/entities/Document.js';

export interface DocumentFilter {
  status?: string;
  documentType?: string;
  batchId?: string;
  search?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export interface PaginationOptions {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface DocumentRepository {
  save(document: Document): Promise<void>;
  findById(tenantId: string, id: string): Promise<Document | null>;
  findByS3Key(s3Key: string): Promise<Document | null>;
  findAll(
    tenantId: string,
    filter: DocumentFilter,
    pagination: PaginationOptions
  ): Promise<PaginatedResult<Document>>;
  updateStatus(
    tenantId: string,
    id: string,
    status: string,
    updates?: Record<string, unknown>
  ): Promise<void>;
  delete(tenantId: string, id: string): Promise<void>;
  countByTenantAndStatus(tenantId: string, status: string): Promise<number>;
}
