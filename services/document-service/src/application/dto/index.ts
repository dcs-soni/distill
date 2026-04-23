import { z } from 'zod/v4';

export const UploadDocumentDto = z.object({
  tenantId: z.string().min(1),
  uploadedById: z.string().min(1),
  fileName: z.string().min(1).max(255),
  mimeType: z.string(),
  fileSize: z.number().int().positive(),
});

export type UploadDocumentInput = z.infer<typeof UploadDocumentDto>;

export const ListDocumentsDto = z.object({
  tenantId: z.string().min(1),
  page: z.number().int().positive().default(1),
  limit: z.number().int().min(1).max(100).default(20),
  sortBy: z.enum(['createdAt', 'fileName', 'status', 'fileSize']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  status: z.string().optional(),
  documentType: z.string().optional(),
  batchId: z.string().optional(),
  search: z.string().optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
});

export type ListDocumentsInput = z.infer<typeof ListDocumentsDto>;

export const GetDocumentDto = z.object({
  tenantId: z.string().min(1),
  documentId: z.string().min(1),
});

export type GetDocumentInput = z.infer<typeof GetDocumentDto>;

export const DeleteDocumentDto = z.object({
  tenantId: z.string().min(1),
  documentId: z.string().min(1),
  userRole: z.string(),
});

export type DeleteDocumentInput = z.infer<typeof DeleteDocumentDto>;

export const UploadBatchDto = z.object({
  tenantId: z.string().min(1),
  uploadedById: z.string().min(1),
  batchName: z.string().min(1).max(255),
});

export type UploadBatchInput = z.infer<typeof UploadBatchDto>;
