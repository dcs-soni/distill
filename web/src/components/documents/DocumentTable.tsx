import { useState, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  type ColumnDef,
  type SortingState,
  flexRender,
} from '@tanstack/react-table';
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  FileText,
  Download,
  Trash2,
  Eye,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { DocumentDTO } from '@/types';
import { StatusBadge } from './StatusBadge';
import { cn, formatFileSize, formatDate } from '@/lib/utils';
import { documentApi } from '@/services/document-api';
import { useDeleteDocument } from '@/hooks/use-documents';

interface DocumentTableProps {
  data: DocumentDTO[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onSortChange: (sortBy: string, sortOrder: 'asc' | 'desc') => void;
  isLoading?: boolean;
}

export function DocumentTable({
  data,
  total,
  page,
  totalPages,
  onPageChange,
  onSortChange,
  isLoading,
}: DocumentTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const navigate = useNavigate();
  const deleteMutation = useDeleteDocument();

  const handleSort = (columnId: string) => {
    const current = sorting.find((s) => s.id === columnId);
    const newOrder = current?.desc === false ? 'desc' : 'asc';
    setSorting([{ id: columnId, desc: newOrder === 'desc' }]);
    onSortChange(columnId, newOrder);
  };

  const toggleRow = (id: string) => {
    setSelectedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedRows.size === data.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(data.map((d) => d.id)));
    }
  };

  const handleBulkDelete = async () => {
    for (const id of selectedRows) {
      await deleteMutation.mutateAsync(id);
    }
    setSelectedRows(new Set());
  };

  const columns: ColumnDef<DocumentDTO>[] = useMemo(
    () => [
      {
        id: 'select',
        header: () => (
          <input
            type="checkbox"
            checked={data.length > 0 && selectedRows.size === data.length}
            onChange={toggleAll}
            className="h-4 w-4 rounded border-[var(--color-border)] accent-[var(--color-primary)]"
            aria-label="Select all"
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            checked={selectedRows.has(row.original.id)}
            onChange={() => toggleRow(row.original.id)}
            className="h-4 w-4 rounded border-[var(--color-border)] accent-[var(--color-primary)]"
            aria-label={`Select ${row.original.fileName}`}
          />
        ),
        size: 40,
      },
      {
        accessorKey: 'fileName',
        header: () => (
          <button
            onClick={() => handleSort('fileName')}
            className="flex items-center gap-1 text-left"
            type="button"
          >
            File Name
            <SortIcon columnId="fileName" sorting={sorting} />
          </button>
        ),
        cell: ({ row }) => (
          <div className="flex items-center gap-2.5 min-w-0">
            <FileText className="h-4 w-4 shrink-0" style={{ color: 'var(--color-primary)' }} />
            <span
              className="truncate font-medium text-sm"
              style={{ color: 'var(--color-foreground)' }}
            >
              {row.original.fileName}
            </span>
          </div>
        ),
      },
      {
        accessorKey: 'status',
        header: () => (
          <button
            onClick={() => handleSort('status')}
            className="flex items-center gap-1"
            type="button"
          >
            Status
            <SortIcon columnId="status" sorting={sorting} />
          </button>
        ),
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        accessorKey: 'fileSize',
        header: () => (
          <button
            onClick={() => handleSort('fileSize')}
            className="flex items-center gap-1"
            type="button"
          >
            Size
            <SortIcon columnId="fileSize" sorting={sorting} />
          </button>
        ),
        cell: ({ row }) => (
          <span className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
            {formatFileSize(row.original.fileSize)}
          </span>
        ),
      },
      {
        accessorKey: 'createdAt',
        header: () => (
          <button
            onClick={() => handleSort('createdAt')}
            className="flex items-center gap-1"
            type="button"
          >
            Uploaded
            <SortIcon columnId="createdAt" sorting={sorting} />
          </button>
        ),
        cell: ({ row }) => (
          <span
            className="text-sm whitespace-nowrap"
            style={{ color: 'var(--color-muted-foreground)' }}
          >
            {formatDate(row.original.createdAt)}
          </span>
        ),
      },
      {
        id: 'actions',
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => (
          <div className="relative flex justify-end">
            <button
              onClick={() => setOpenMenu(openMenu === row.original.id ? null : row.original.id)}
              className="flex h-8 w-8 items-center justify-center rounded-md transition-colors hover:bg-white/10"
              style={{ color: 'var(--color-muted-foreground)' }}
              type="button"
              aria-label="Row actions"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
            {openMenu === row.original.id && (
              <div
                className="absolute right-0 top-full z-50 mt-1 w-40 overflow-hidden rounded-lg border shadow-xl animate-fade-in"
                style={{
                  backgroundColor: 'var(--color-popover)',
                  borderColor: 'var(--color-border)',
                }}
              >
                <button
                  onClick={() => {
                    setOpenMenu(null);
                    void navigate(`/documents/${row.original.id}`);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-white/5"
                  style={{ color: 'var(--color-popover-foreground)' }}
                  type="button"
                >
                  <Eye className="h-3.5 w-3.5" /> View
                </button>
                <button
                  onClick={() => {
                    setOpenMenu(null);
                    window.open(documentApi.download(row.original.id), '_blank');
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-white/5"
                  style={{ color: 'var(--color-popover-foreground)' }}
                  type="button"
                >
                  <Download className="h-3.5 w-3.5" /> Download
                </button>
                <button
                  onClick={() => {
                    setOpenMenu(null);
                    if (confirm('Delete this document?')) {
                      deleteMutation.mutate(row.original.id);
                    }
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-white/5"
                  style={{ color: 'var(--color-destructive)' }}
                  type="button"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </button>
              </div>
            )}
          </div>
        ),
        size: 50,
      },
    ],
    [sorting, selectedRows, openMenu, data]
  );

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualSorting: true,
  });

  return (
    <div className="space-y-4">
      {/* Bulk actions bar */}
      {selectedRows.size > 0 && (
        <div
          className="flex items-center justify-between rounded-lg border px-4 py-2 animate-fade-in"
          style={{ borderColor: 'var(--color-primary)', backgroundColor: 'rgba(99,102,241,0.05)' }}
        >
          <span className="text-sm" style={{ color: 'var(--color-primary)' }}>
            {selectedRows.size} selected
          </span>
          <button
            onClick={() => {
              if (confirm(`Delete ${selectedRows.size} documents?`)) {
                void handleBulkDelete();
              }
            }}
            className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors hover:bg-red-500/20"
            style={{ color: 'var(--color-destructive)' }}
            type="button"
          >
            <Trash2 className="h-3.5 w-3.5" /> Delete selected
          </button>
        </div>
      )}

      {/* Table */}
      <div
        className="overflow-hidden rounded-xl border"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id} style={{ backgroundColor: 'var(--color-card)' }}>
                  {hg.headers.map((header) => (
                    <th
                      key={header.id}
                      className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider"
                      style={{
                        color: 'var(--color-muted-foreground)',
                        width: header.getSize() !== 150 ? header.getSize() : undefined,
                      }}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} style={{ borderTop: '1px solid var(--color-border)' }}>
                    {columns.map((_, ci) => (
                      <td key={ci} className="px-4 py-3">
                        <div
                          className="h-4 rounded animate-shimmer"
                          style={{ backgroundColor: 'var(--color-muted)' }}
                        />
                      </td>
                    ))}
                  </tr>
                ))
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-16 text-center">
                    <FileText
                      className="mx-auto mb-3 h-10 w-10"
                      style={{ color: 'var(--color-muted-foreground)' }}
                    />
                    <p
                      className="text-sm font-medium"
                      style={{ color: 'var(--color-muted-foreground)' }}
                    >
                      No documents found
                    </p>
                    <p className="mt-1 text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
                      Upload your first PDF to get started
                    </p>
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    className="transition-colors hover:bg-white/[0.02]"
                    style={{ borderTop: '1px solid var(--color-border)' }}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-4 py-3 text-sm">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
            Showing {(page - 1) * 20 + 1}–{Math.min(page * 20, total)} of {total}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              className="flex h-8 w-8 items-center justify-center rounded-md border transition-colors hover:bg-white/5 disabled:opacity-40"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }}
              type="button"
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              const pageNum = i + 1;
              return (
                <button
                  key={pageNum}
                  onClick={() => onPageChange(pageNum)}
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-md text-sm font-medium transition-colors',
                    page === pageNum ? 'border' : 'hover:bg-white/5'
                  )}
                  style={{
                    borderColor: page === pageNum ? 'var(--color-primary)' : 'transparent',
                    color:
                      page === pageNum ? 'var(--color-primary)' : 'var(--color-muted-foreground)',
                    backgroundColor: page === pageNum ? 'rgba(99,102,241,0.1)' : 'transparent',
                  }}
                  type="button"
                >
                  {pageNum}
                </button>
              );
            })}
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              className="flex h-8 w-8 items-center justify-center rounded-md border transition-colors hover:bg-white/5 disabled:opacity-40"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }}
              type="button"
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function SortIcon({ columnId, sorting }: { columnId: string; sorting: SortingState }) {
  const sort = sorting.find((s) => s.id === columnId);
  if (!sort) return <ArrowUpDown className="h-3 w-3 opacity-40" />;
  return sort.desc ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />;
}
