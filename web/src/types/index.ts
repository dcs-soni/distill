/* Document Types — mirrors backend DTOs */

export type DocumentStatus =
  | 'QUEUED'
  | 'PROCESSING'
  | 'EXTRACTED'
  | 'VALIDATED'
  | 'REVIEW_NEEDED'
  | 'APPROVED'
  | 'REJECTED'
  | 'FAILED';

export interface DocumentDTO {
  id: string;
  tenantId: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  s3Key: string;
  status: DocumentStatus;
  documentType?: string;
  pageCount?: number;
  isScanned?: boolean;
  uploadedById: string;
  batchId?: string;
  retryCount: number;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface UploadResponse {
  data: DocumentDTO;
  message: string;
}

export interface BatchUploadResponse {
  data: {
    batch: {
      id: string;
      tenantId: string;
      name: string;
      totalDocuments: number;
      processedCount: number;
      failedCount: number;
      status: string;
    };
    succeeded: string[];
    failed: Array<{ fileName: string; error: string }>;
  };
}

export interface DocumentWithDownload extends DocumentDTO {
  downloadUrl: string;
}

/* Auth Types */

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  isActive: boolean;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan: string;
}

export interface AuthState {
  user: User | null;
  tenant: Tenant | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}
