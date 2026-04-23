import { useState } from 'react';
import { useDocuments } from '@/hooks/use-documents';
import { UploadDropzone } from '@/components/documents/UploadDropzone';
import { DocumentTable } from '@/components/documents/DocumentTable';
import { Search, Filter, X } from 'lucide-react';

export function DocumentsPage() {
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<string>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const { data, isLoading } = useDocuments({
    page,
    limit: 20,
    sortBy: sortBy as 'createdAt' | 'fileName' | 'status' | 'fileSize',
    sortOrder,
    search: search || undefined,
    status: statusFilter || undefined,
  });

  const handleSortChange = (newSortBy: string, newSortOrder: 'asc' | 'desc') => {
    setSortBy(newSortBy);
    setSortOrder(newSortOrder);
    setPage(1);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      {/* Page header */}
      <div>
        <h1
          className="text-2xl font-bold tracking-tight"
          style={{ color: 'var(--color-foreground)' }}
        >
          Documents
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
          Upload, manage, and track your financial documents through the extraction pipeline.
        </p>
      </div>

      {/* Upload section */}
      <UploadDropzone />

      {/* Search and filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
            style={{ color: 'var(--color-muted-foreground)' }}
          />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search documents..."
            className="w-full rounded-lg border py-2 pl-9 pr-4 text-sm transition-colors focus:outline-none focus:ring-2"
            style={{
              backgroundColor: 'var(--color-card)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-foreground)',
            }}
            id="document-search"
          />
          {search && (
            <button
              onClick={() => {
                setSearch('');
                setPage(1);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2"
              style={{ color: 'var(--color-muted-foreground)' }}
              type="button"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors hover:bg-white/5"
          style={{
            borderColor: showFilters ? 'var(--color-primary)' : 'var(--color-border)',
            color: showFilters ? 'var(--color-primary)' : 'var(--color-foreground)',
          }}
          type="button"
        >
          <Filter className="h-4 w-4" /> Filters
          {statusFilter && (
            <span
              className="flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold"
              style={{ backgroundColor: 'var(--color-primary)', color: '#fff' }}
            >
              1
            </span>
          )}
        </button>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="flex flex-wrap gap-2 animate-fade-in">
          {[
            '',
            'QUEUED',
            'PROCESSING',
            'EXTRACTED',
            'VALIDATED',
            'REVIEW_NEEDED',
            'APPROVED',
            'REJECTED',
            'FAILED',
          ].map((status) => (
            <button
              key={status}
              onClick={() => {
                setStatusFilter(status);
                setPage(1);
              }}
              className="rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-200"
              style={{
                borderColor:
                  statusFilter === status ? 'var(--color-primary)' : 'var(--color-border)',
                color:
                  statusFilter === status
                    ? 'var(--color-primary)'
                    : 'var(--color-muted-foreground)',
                backgroundColor: statusFilter === status ? 'rgba(99,102,241,0.1)' : 'transparent',
              }}
              type="button"
            >
              {status || 'All'}
            </button>
          ))}
        </div>
      )}

      {/* Document table */}
      <DocumentTable
        data={data?.data ?? []}
        total={data?.meta?.total ?? 0}
        page={data?.meta?.page ?? page}
        limit={data?.meta?.limit ?? 20}
        totalPages={data?.meta?.totalPages ?? 0}
        onPageChange={setPage}
        onSortChange={handleSortChange}
        isLoading={isLoading}
      />
    </div>
  );
}
