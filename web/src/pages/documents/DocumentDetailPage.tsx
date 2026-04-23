import { useParams, useNavigate } from 'react-router-dom';
import { useDocument } from '@/hooks/use-documents';
import { StatusBadge } from '@/components/documents/StatusBadge';
import { formatFileSize, formatDate } from '@/lib/utils';
import { ArrowLeft, Download, FileText, Loader2 } from 'lucide-react';

export function DocumentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: document, isLoading, isError } = useDocument(id ?? '');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: 'var(--color-primary)' }} />
      </div>
    );
  }

  if (isError || !document) {
    return (
      <div className="mx-auto max-w-2xl py-16 text-center">
        <FileText
          className="mx-auto mb-4 h-12 w-12"
          style={{ color: 'var(--color-muted-foreground)' }}
        />
        <h2 className="text-lg font-semibold" style={{ color: 'var(--color-foreground)' }}>
          Document Not Found
        </h2>
        <p className="mt-2 text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
          The document you're looking for doesn't exist or you don't have access.
        </p>
        <button
          onClick={() => void navigate('/documents')}
          className="mt-6 inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors hover:bg-white/5"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }}
          type="button"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Documents
        </button>
      </div>
    );
  }

  const infoRows = [
    { label: 'File Name', value: document.fileName },
    { label: 'Size', value: formatFileSize(document.fileSize) },
    { label: 'MIME Type', value: document.mimeType },
    { label: 'Document Type', value: document.documentType ?? '—' },
    { label: 'Page Count', value: document.pageCount?.toString() ?? '—' },
    {
      label: 'Scanned',
      value: document.isScanned != null ? (document.isScanned ? 'Yes' : 'No') : '—',
    },
    { label: 'Uploaded By', value: document.uploadedById },
    { label: 'Batch ID', value: document.batchId ?? '—' },
    { label: 'Retry Count', value: document.retryCount.toString() },
    { label: 'Error', value: document.errorMessage ?? '—' },
    { label: 'Created', value: formatDate(document.createdAt) },
    { label: 'Updated', value: formatDate(document.updatedAt) },
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Back button */}
      <button
        onClick={() => void navigate('/documents')}
        className="flex items-center gap-1.5 text-sm transition-colors hover:opacity-80"
        style={{ color: 'var(--color-muted-foreground)' }}
        type="button"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Documents
      </button>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-xl"
            style={{
              background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(129,140,248,0.1))',
            }}
          >
            <FileText className="h-6 w-6" style={{ color: 'var(--color-primary)' }} />
          </div>
          <div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--color-foreground)' }}>
              {document.fileName}
            </h1>
            <StatusBadge status={document.status} className="mt-1" />
          </div>
        </div>
        <a
          href={document.downloadUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 hover:opacity-90"
          style={{
            background: 'linear-gradient(135deg, var(--color-primary), #818cf8)',
            color: '#fff',
          }}
        >
          <Download className="h-4 w-4" /> Download
        </a>
      </div>

      {/* Metadata */}
      <div
        className="overflow-hidden rounded-xl border"
        style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)' }}
      >
        <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--color-foreground)' }}>
            Document Details
          </h2>
        </div>
        <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
          {infoRows.map((row) => (
            <div key={row.label} className="flex justify-between px-4 py-3">
              <span className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
                {row.label}
              </span>
              <span
                className="text-sm font-medium text-right max-w-[60%] truncate"
                style={{ color: 'var(--color-foreground)' }}
              >
                {row.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
