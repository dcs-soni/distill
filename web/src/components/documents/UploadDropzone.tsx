import { useCallback, useState, useRef } from 'react';
import { Upload, FileText, X, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { cn, formatFileSize } from '@/lib/utils';
import { useUploadDocument, useUploadBatch } from '@/hooks/use-documents';

const MAX_FILE_SIZE = 50 * 1024 * 1024;
const ACCEPTED_TYPE = 'application/pdf';

interface FileEntry {
  file: File;
  id: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
}

export function UploadDropzone() {
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const uploadMutation = useUploadDocument();
  const batchMutation = useUploadBatch();

  const validateFile = (file: File): string | null => {
    if (file.type !== ACCEPTED_TYPE) {
      return `Invalid file type: ${file.type || 'unknown'}. Only PDF files are accepted.`;
    }
    if (file.size > MAX_FILE_SIZE) {
      return `File too large: ${formatFileSize(file.size)}. Maximum size is 50MB.`;
    }
    if (file.size === 0) {
      return 'File is empty.';
    }
    return null;
  };

  const addFiles = useCallback((newFiles: File[]) => {
    const entries: FileEntry[] = newFiles.map((file) => {
      const error = validateFile(file);
      return {
        file,
        id: `${file.name}-${Date.now()}-${Math.random()}`,
        status: error ? ('error' as const) : ('pending' as const),
        progress: 0,
        error: error ?? undefined,
      };
    });
    setFiles((prev) => [...prev, ...entries]);
  }, []);

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const dropped = Array.from(e.dataTransfer.files);
      addFiles(dropped);
    },
    [addFiles]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleBrowse = () => {
    inputRef.current?.click();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      addFiles(Array.from(e.target.files));
    }
    e.target.value = '';
  };

  const handleUploadAll = async () => {
    const validFiles = files.filter((f) => f.status === 'pending');
    if (validFiles.length === 0) return;

    if (validFiles.length === 1) {
      const entry = validFiles[0];
      setFiles((prev) =>
        prev.map((f) =>
          f.id === entry.id ? { ...f, status: 'uploading' as const, progress: 0 } : f
        )
      );
      try {
        await uploadMutation.mutateAsync({
          file: entry.file,
          onProgress: (pct) => {
            setFiles((prev) => prev.map((f) => (f.id === entry.id ? { ...f, progress: pct } : f)));
          },
        });
        setFiles((prev) =>
          prev.map((f) =>
            f.id === entry.id ? { ...f, status: 'success' as const, progress: 100 } : f
          )
        );
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Upload failed';
        setFiles((prev) =>
          prev.map((f) => (f.id === entry.id ? { ...f, status: 'error' as const, error: msg } : f))
        );
      }
    } else {
      for (const entry of validFiles) {
        setFiles((prev) =>
          prev.map((f) => (f.id === entry.id ? { ...f, status: 'uploading' as const } : f))
        );
      }
      try {
        await batchMutation.mutateAsync({
          files: validFiles.map((f) => f.file),
          batchName: `Upload ${new Date().toLocaleDateString()}`,
          onProgress: (pct) => {
            setFiles((prev) =>
              prev.map((f) => (f.status === 'uploading' ? { ...f, progress: pct } : f))
            );
          },
        });
        setFiles((prev) =>
          prev.map((f) =>
            f.status === 'uploading' ? { ...f, status: 'success' as const, progress: 100 } : f
          )
        );
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Batch upload failed';
        setFiles((prev) =>
          prev.map((f) =>
            f.status === 'uploading' ? { ...f, status: 'error' as const, error: msg } : f
          )
        );
      }
    }
  };

  const pendingCount = files.filter((f) => f.status === 'pending').length;
  const isUploading = files.some((f) => f.status === 'uploading');

  return (
    <div className="space-y-4">
      {/* Dropzone area */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handleBrowse}
        className={cn(
          'group relative flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-all duration-300',
          isDragOver
            ? 'scale-[1.01] border-[var(--color-primary)] bg-[rgba(99,102,241,0.05)]'
            : 'border-[var(--color-border)] hover:border-[var(--color-primary)] hover:bg-[rgba(99,102,241,0.02)]'
        )}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && handleBrowse()}
        id="upload-dropzone"
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,application/pdf"
          multiple
          onChange={handleInputChange}
          className="hidden"
          aria-label="Choose PDF files to upload"
        />

        <div
          className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl transition-transform duration-300 group-hover:scale-110"
          style={{
            background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(129,140,248,0.1))',
          }}
        >
          <Upload className="h-6 w-6" style={{ color: 'var(--color-primary)' }} />
        </div>
        <p className="mb-1 text-sm font-medium" style={{ color: 'var(--color-foreground)' }}>
          {isDragOver ? 'Drop your PDF files here' : 'Drag & drop PDF files, or click to browse'}
        </p>
        <p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
          PDF only • Max 50MB per file • Up to 100 files per batch
        </p>
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((entry) => (
            <div
              key={entry.id}
              className="flex items-center gap-3 rounded-lg border p-3 animate-fade-in"
              style={{
                borderColor:
                  entry.status === 'error' ? 'rgba(239,68,68,0.3)' : 'var(--color-border)',
                backgroundColor:
                  entry.status === 'error' ? 'rgba(239,68,68,0.05)' : 'var(--color-card)',
              }}
            >
              <FileText className="h-5 w-5 shrink-0" style={{ color: 'var(--color-primary)' }} />
              <div className="min-w-0 flex-1">
                <p
                  className="truncate text-sm font-medium"
                  style={{ color: 'var(--color-foreground)' }}
                >
                  {entry.file.name}
                </p>
                <p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
                  {formatFileSize(entry.file.size)}
                  {entry.error && (
                    <span style={{ color: 'var(--color-destructive)' }}> — {entry.error}</span>
                  )}
                </p>
                {entry.status === 'uploading' && (
                  <div
                    className="mt-1.5 h-1 overflow-hidden rounded-full"
                    style={{ backgroundColor: 'var(--color-muted)' }}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${entry.progress}%`,
                        background: 'linear-gradient(90deg, var(--color-primary), #818cf8)',
                      }}
                    />
                  </div>
                )}
              </div>
              <div className="shrink-0">
                {entry.status === 'uploading' && (
                  <Loader2
                    className="h-4 w-4 animate-spin"
                    style={{ color: 'var(--color-primary)' }}
                  />
                )}
                {entry.status === 'success' && (
                  <CheckCircle2 className="h-4 w-4" style={{ color: 'var(--color-success)' }} />
                )}
                {entry.status === 'error' && (
                  <AlertCircle className="h-4 w-4" style={{ color: 'var(--color-destructive)' }} />
                )}
                {entry.status === 'pending' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(entry.id);
                    }}
                    className="flex h-6 w-6 items-center justify-center rounded-md transition-colors duration-200 hover:bg-white/10"
                    style={{ color: 'var(--color-muted-foreground)' }}
                    type="button"
                    aria-label={`Remove ${entry.file.name}`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}

          {/* Upload button */}
          {pendingCount > 0 && (
            <button
              onClick={() => void handleUploadAll()}
              disabled={isUploading}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all duration-200 hover:opacity-90 disabled:opacity-50"
              style={{
                background: 'linear-gradient(135deg, var(--color-primary), #818cf8)',
                color: 'var(--color-primary-foreground)',
              }}
              type="button"
              id="upload-submit-btn"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Uploading…
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Upload {pendingCount} {pendingCount === 1 ? 'file' : 'files'}
                </>
              )}
            </button>
          )}

          {/* Clear completed */}
          {files.some((f) => f.status === 'success' || f.status === 'error') && !isUploading && (
            <button
              onClick={() =>
                setFiles((prev) =>
                  prev.filter((f) => f.status === 'pending' || f.status === 'uploading')
                )
              }
              className="text-xs underline transition-colors duration-200 hover:opacity-80"
              style={{ color: 'var(--color-muted-foreground)' }}
              type="button"
            >
              Clear completed
            </button>
          )}
        </div>
      )}
    </div>
  );
}
