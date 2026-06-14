import { FileText, CheckCircle, Clock, Percent } from 'lucide-react';
import { useDashboardMetrics } from '../../hooks/use-analytics.js';
import { AccuracyChart } from './AccuracyChart.js';

export function DashboardPage() {
  const { data: metrics, isLoading, isError } = useDashboardMetrics();

  if (isError) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <p className="text-red-500">Failed to load dashboard metrics. Please try again.</p>
      </div>
    );
  }

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

      {/* Metrics cards */}
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div
          className="rounded-xl border p-5 transition-all duration-200 hover:border-[var(--color-primary)]/30"
          style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)' }}
        >
          <div className="flex items-center justify-between">
            <p
              className="text-xs font-medium uppercase tracking-wider"
              style={{ color: 'var(--color-muted-foreground)' }}
            >
              Total Documents
            </p>
            <FileText className="h-4 w-4 text-blue-500" />
          </div>
          <p className="mt-2 text-2xl font-bold" style={{ color: 'var(--color-foreground)' }}>
            {isLoading ? '...' : metrics?.totalDocuments.allTime.toLocaleString() || '0'}
          </p>
          <p className="mt-1 text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
            {isLoading ? 'Loading...' : `+${metrics?.totalDocuments.today || 0} today`}
          </p>
        </div>

        <div
          className="rounded-xl border p-5 transition-all duration-200 hover:border-[var(--color-primary)]/30"
          style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)' }}
        >
          <div className="flex items-center justify-between">
            <p
              className="text-xs font-medium uppercase tracking-wider"
              style={{ color: 'var(--color-muted-foreground)' }}
            >
              Success Rate
            </p>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </div>
          <p className="mt-2 text-2xl font-bold" style={{ color: 'var(--color-foreground)' }}>
            {isLoading ? '...' : `${(metrics?.successRate || 0).toFixed(1)}%`}
          </p>
          <p className="mt-1 text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
            {isLoading
              ? 'Loading...'
              : `${metrics?.statusDistribution['EXTRACTION_COMPLETED'] || 0} extractions completed`}
          </p>
        </div>

        <div
          className="rounded-xl border p-5 transition-all duration-200 hover:border-[var(--color-primary)]/30"
          style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)' }}
        >
          <div className="flex items-center justify-between">
            <p
              className="text-xs font-medium uppercase tracking-wider"
              style={{ color: 'var(--color-muted-foreground)' }}
            >
              Avg Confidence
            </p>
            <Percent className="h-4 w-4 text-purple-500" />
          </div>
          <p className="mt-2 text-2xl font-bold" style={{ color: 'var(--color-foreground)' }}>
            {isLoading ? '...' : `${((metrics?.averageConfidence || 0) * 100).toFixed(1)}%`}
          </p>
          <p className="mt-1 text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
            {isLoading ? 'Loading...' : 'Across all processed documents'}
          </p>
        </div>

        <div
          className="rounded-xl border p-5 transition-all duration-200 hover:border-[var(--color-primary)]/30"
          style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)' }}
        >
          <div className="flex items-center justify-between">
            <p
              className="text-xs font-medium uppercase tracking-wider"
              style={{ color: 'var(--color-muted-foreground)' }}
            >
              Avg Processing Time
            </p>
            <Clock className="h-4 w-4 text-amber-500" />
          </div>
          <p className="mt-2 text-2xl font-bold" style={{ color: 'var(--color-foreground)' }}>
            {isLoading ? '...' : `${((metrics?.averageProcessingTimeMs || 0) / 1000).toFixed(2)}s`}
          </p>
          <p className="mt-1 text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
            {isLoading ? 'Loading...' : 'End-to-end extraction latency'}
          </p>
        </div>
      </div>

      <div className="mt-8">
        <AccuracyChart />
      </div>
    </div>
  );
}
