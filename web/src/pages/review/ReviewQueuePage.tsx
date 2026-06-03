import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  type ColumnDef,
  type SortingState,
  flexRender,
} from '@tanstack/react-table';
import { ArrowUpDown, ArrowUp, ArrowDown, Search, Filter, PartyPopper } from 'lucide-react';
import { usePendingReviews } from '../../hooks/use-reviews';
import type { Review } from '@distill/types';
import { cn, formatDate } from '../../lib/utils';

export function ReviewQueuePage() {
  const [page, setPage] = useState(1);
  const [sorting, setSorting] = useState<SortingState>([]);
  const navigate = useNavigate();

  const { data, isLoading } = usePendingReviews({
    page,
    limit: 20,
    sortBy: sorting.length ? sorting[0].id : 'priority',
  });

  const handleSort = React.useCallback(
    (columnId: string) => {
      const current = sorting.find((s) => s.id === columnId);
      const newOrder = current?.desc === false ? 'desc' : 'asc';
      setSorting([{ id: columnId, desc: newOrder === 'desc' }]);
    },
    [sorting]
  );

  const columns: ColumnDef<Review>[] = useMemo(
    () => [
      {
        accessorKey: 'documentId', // In a real app we'd map this to document name via joined data
        header: 'Document ID',
        cell: ({ row }) => (
          <div className="font-medium text-sm text-slate-900 truncate max-w-[200px]">
            {row.original.documentId.split('-')[0]}...
          </div>
        ),
      },
      {
        accessorKey: 'priority',
        header: () => (
          <button
            onClick={() => handleSort('priority')}
            className="flex items-center gap-1 font-medium"
          >
            Priority <SortIcon columnId="priority" sorting={sorting} />
          </button>
        ),
        cell: ({ row }) => {
          const priority = row.original.priority as unknown as string;
          return (
            <span
              className={cn(
                'px-2 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider',
                priority === 'ESCALATED'
                  ? 'bg-red-100 text-red-700'
                  : priority === 'HIGH'
                    ? 'bg-orange-100 text-orange-700'
                    : 'bg-slate-100 text-slate-700'
              )}
            >
              {priority || 'NORMAL'}
            </span>
          );
        },
      },
      {
        accessorKey: 'createdAt',
        header: () => (
          <button
            onClick={() => handleSort('createdAt')}
            className="flex items-center gap-1 font-medium"
          >
            Queued At <SortIcon columnId="createdAt" sorting={sorting} />
          </button>
        ),
        cell: ({ row }) => (
          <span className="text-sm text-slate-500">{formatDate(row.original.createdAt)}</span>
        ),
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <div className="text-right">
            <button
              onClick={() => {
                void navigate(`/reviews/${row.original.id}`);
              }}
              className="text-sm font-medium text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1 rounded-md transition-colors"
            >
              Review
            </button>
          </div>
        ),
      },
    ],
    [sorting, navigate, handleSort]
  );

  const table = useReactTable({
    data: data?.items || [],
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualSorting: true,
  });

  return (
    <div className="flex-1 p-8 bg-slate-50 min-h-screen">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Review Queue</h1>
            <p className="text-sm text-slate-500 mt-1">Documents requiring human verification.</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-md px-3 py-1.5 text-sm shadow-sm">
              <span className="text-slate-500">Pending:</span>
              <span className="font-semibold text-slate-900">{data?.total || 0}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex flex-wrap gap-4 items-center justify-between bg-slate-50/50">
            <div className="relative max-w-sm flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search documents..."
                className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <button className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors">
              <Filter className="h-4 w-4" />
              Filters
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                {table.getHeaderGroups().map((hg) => (
                  <tr key={hg.id} className="border-b border-slate-200 bg-slate-50">
                    {hg.headers.map((header) => (
                      <th
                        key={header.id}
                        className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider"
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      {columns.map((_, ci) => (
                        <td key={ci} className="px-6 py-4">
                          <div className="h-4 bg-slate-100 rounded animate-pulse" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : data?.items.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center justify-center space-y-3">
                        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-2">
                          <PartyPopper className="w-8 h-8" />
                        </div>
                        <h3 className="text-lg font-medium text-slate-900">Queue is empty!</h3>
                        <p className="text-sm text-slate-500">All caught up. Great job!</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  table.getRowModel().rows.map((row) => (
                    <tr
                      key={row.id}
                      className="transition-colors hover:bg-slate-50 group cursor-pointer"
                      onClick={() => {
                        void navigate(`/reviews/${row.original.id}`);
                      }}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="px-6 py-4">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Component */}
          {data && data.totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-3 border-t border-slate-200 bg-slate-50">
              <span className="text-sm text-slate-500">
                Showing <span className="font-medium text-slate-900">{(page - 1) * 20 + 1}</span> to{' '}
                <span className="font-medium text-slate-900">
                  {Math.min(page * 20, data.total)}
                </span>{' '}
                of <span className="font-medium text-slate-900">{data.total}</span> results
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1 border border-slate-300 rounded-md text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                  disabled={page === data.totalPages}
                  className="px-3 py-1 border border-slate-300 rounded-md text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SortIcon({ columnId, sorting }: { columnId: string; sorting: SortingState }) {
  const sort = sorting.find((s) => s.id === columnId);
  if (!sort) return <ArrowUpDown className="h-3 w-3 opacity-40 inline ml-1" />;
  return sort.desc ? (
    <ArrowDown className="h-3 w-3 inline ml-1" />
  ) : (
    <ArrowUp className="h-3 w-3 inline ml-1" />
  );
}
