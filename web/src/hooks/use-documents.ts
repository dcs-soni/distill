import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { documentApi, type ListDocumentsParams } from '@/services/document-api';

export const documentKeys = {
  all: ['documents'] as const,
  lists: () => [...documentKeys.all, 'list'] as const,
  list: (params: ListDocumentsParams) => [...documentKeys.lists(), params] as const,
  details: () => [...documentKeys.all, 'detail'] as const,
  detail: (id: string) => [...documentKeys.details(), id] as const,
};

export function useDocuments(params: ListDocumentsParams = {}) {
  return useQuery({
    queryKey: documentKeys.list(params),
    queryFn: () => documentApi.list(params),
    staleTime: 30_000,
  });
}

export function useDocument(id: string) {
  return useQuery({
    queryKey: documentKeys.detail(id),
    queryFn: () => documentApi.getById(id),
    enabled: !!id,
  });
}

export function useUploadDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ file, onProgress }: { file: File; onProgress?: (pct: number) => void }) =>
      documentApi.upload(file, onProgress),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: documentKeys.lists() });
    },
  });
}

export function useUploadBatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      files,
      batchName,
      onProgress,
    }: {
      files: File[];
      batchName?: string;
      onProgress?: (pct: number) => void;
    }) => documentApi.uploadBatch(files, batchName, onProgress),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: documentKeys.lists() });
    },
  });
}

export function useDeleteDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => documentApi.delete(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: documentKeys.lists() });
    },
  });
}
