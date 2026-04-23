import { LayoutDashboard } from 'lucide-react';

export function DashboardPage() {
  return (
    <div className="mx-auto max-w-7xl">
      <h1
        className="text-2xl font-bold tracking-tight"
        style={{ color: 'var(--color-foreground)' }}
      >
        Dashboard
      </h1>
      <p className="mt-1 text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
        Overview of your document processing pipeline.
      </p>

      {/* Metrics cards placeholder */}
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {['Total Documents', 'Processing', 'Needs Review', 'Approved'].map((label) => (
          <div
            key={label}
            className="rounded-xl border p-5 transition-all duration-200 hover:border-[var(--color-primary)]/30"
            style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)' }}
          >
            <p
              className="text-xs font-medium uppercase tracking-wider"
              style={{ color: 'var(--color-muted-foreground)' }}
            >
              {label}
            </p>
            <p className="mt-2 text-2xl font-bold" style={{ color: 'var(--color-foreground)' }}>
              —
            </p>
            <p className="mt-1 text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
              Metrics available after M8
            </p>
          </div>
        ))}
      </div>

      <div
        className="mt-8 flex flex-col items-center justify-center rounded-xl border py-16"
        style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)' }}
      >
        <LayoutDashboard
          className="mb-3 h-10 w-10"
          style={{ color: 'var(--color-muted-foreground)' }}
        />
        <p className="text-sm font-medium" style={{ color: 'var(--color-muted-foreground)' }}>
          Dashboard analytics will be available in Milestone 8
        </p>
      </div>
    </div>
  );
}
