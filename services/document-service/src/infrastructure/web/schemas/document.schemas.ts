import { z } from 'zod/v4';

const DOCUMENT_STATUSES = [
  'QUEUED',
  'PROCESSING',
  'EXTRACTED',
  'VALIDATED',
  'REVIEW_NEEDED',
  'APPROVED',
  'REJECTED',
  'FAILED',
] as const;

const SORT_BY_FIELDS = ['createdAt', 'fileName', 'status', 'fileSize'] as const;
const SORT_ORDERS = ['asc', 'desc'] as const;

export const TenantHeaders = z.object({
  'x-tenant-id': z.string().min(1),
  'x-user-id': z.string().min(1).optional(),
  'x-user-role': z.string().optional(),
});

export const TenantOnlyHeaders = z.object({
  'x-tenant-id': z.string().min(1),
});

export const DocumentIdParams = z.object({
  id: z.string().min(1),
});

export const ListDocumentsQuery = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(SORT_BY_FIELDS).optional(),
  sortOrder: z.enum(SORT_ORDERS).optional(),
  status: z.enum(DOCUMENT_STATUSES).optional(),
  documentType: z.string().optional(),
  batchId: z.string().optional(),
  search: z.string().max(255).optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
});

export const DocumentResponseSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  fileName: z.string(),
  mimeType: z.string(),
  fileSize: z.number(),
  s3Key: z.string(),
  status: z.enum(DOCUMENT_STATUSES),
  documentType: z.string().nullable().optional(),
  pageCount: z.number().nullable().optional(),
  isScanned: z.boolean().nullable().optional(),
  uploadedById: z.string(),
  batchId: z.string().nullable().optional(),
  retryCount: z.number(),
  errorMessage: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const UploadResponseSchema = z.object({
  data: DocumentResponseSchema,
  message: z.string(),
});

export const DocumentDetailResponseSchema = z.object({
  data: DocumentResponseSchema.extend({
    downloadUrl: z.string(),
  }),
});

export const DownloadResponseSchema = z.object({
  url: z.string(),
  expiresIn: z.number(),
});

export const ListDocumentsResponseSchema = z.object({
  data: z.array(DocumentResponseSchema),
  meta: z.object({
    total: z.number(),
    page: z.number(),
    limit: z.number(),
    totalPages: z.number(),
  }),
});

export const BatchNameQuery = z.object({
  name: z.string().min(1).max(255).optional(),
});

export const BatchDocumentResponseSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  name: z.string(),
  totalDocuments: z.number(),
  processedCount: z.number(),
  failedCount: z.number(),
  status: z.string(),
  uploadedById: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const BatchUploadResponseSchema = z.object({
  data: z.object({
    batch: BatchDocumentResponseSchema,
    succeeded: z.array(z.string()),
    failed: z.array(
      z.object({
        fileName: z.string(),
        error: z.string(),
      })
    ),
  }),
});

export const ErrorResponseSchema = z.object({
  error: z.string(),
  message: z.string(),
  details: z.unknown().optional(),
});
