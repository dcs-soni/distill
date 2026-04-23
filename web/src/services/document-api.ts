import apiClient from './api-client';
import type {
  DocumentDTO,
  PaginatedResponse,
  UploadResponse,
  BatchUploadResponse,
  DocumentWithDownload,
} from '@/types';

export interface ListDocumentsParams {
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'fileName' | 'status' | 'fileSize';
  sortOrder?: 'asc' | 'desc';
  status?: string;
  documentType?: string;
  batchId?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}

export const documentApi = {
  list: async (params: ListDocumentsParams = {}): Promise<PaginatedResponse<DocumentDTO>> => {
    const { data } = await apiClient.get<PaginatedResponse<DocumentDTO>>('/documents', { params });
    return data;
  },

  getById: async (id: string): Promise<DocumentWithDownload> => {
    const { data } = await apiClient.get<{ data: DocumentWithDownload }>(`/documents/${id}`);
    return data.data;
  },

  upload: async (file: File, onProgress?: (pct: number) => void): Promise<UploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await apiClient.post<UploadResponse>('/documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000,
      onUploadProgress: (e) => {
        if (e.total && onProgress) {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      },
    });
    return data;
  },

  uploadBatch: async (
    files: File[],
    batchName?: string,
    onProgress?: (pct: number) => void
  ): Promise<BatchUploadResponse> => {
    const formData = new FormData();
    for (const file of files) {
      formData.append('files', file);
    }
    const params = batchName ? { name: batchName } : {};
    const { data } = await apiClient.post<BatchUploadResponse>(
      '/documents/upload/batch',
      formData,
      {
        params,
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 300000,
        onUploadProgress: (e) => {
          if (e.total && onProgress) {
            onProgress(Math.round((e.loaded / e.total) * 100));
          }
        },
      }
    );
    return data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/documents/${id}`);
  },

  download: (id: string): string => {
    return `${apiClient.defaults.baseURL}/documents/${id}/download`;
  },
};
