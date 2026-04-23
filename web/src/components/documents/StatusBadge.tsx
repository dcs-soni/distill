import { cn } from '@/lib/utils';
import type { DocumentStatus } from '@/types';

const statusConfig: Record<
  DocumentStatus,
  { label: string; dotColor: string; bgColor: string; textColor: string; pulse?: boolean }
> = {
  QUEUED: {
    label: 'Queued',
    dotColor: '#a1a1aa',
    bgColor: 'rgba(161, 161, 170, 0.1)',
    textColor: '#a1a1aa',
  },
  PROCESSING: {
    label: 'Processing',
    dotColor: '#6366f1',
    bgColor: 'rgba(99, 102, 241, 0.1)',
    textColor: '#818cf8',
    pulse: true,
  },
  EXTRACTED: {
    label: 'Extracted',
    dotColor: '#3b82f6',
    bgColor: 'rgba(59, 130, 246, 0.1)',
    textColor: '#60a5fa',
  },
  VALIDATED: {
    label: 'Validated',
    dotColor: '#22c55e',
    bgColor: 'rgba(34, 197, 94, 0.1)',
    textColor: '#4ade80',
  },
  REVIEW_NEEDED: {
    label: 'Needs Review',
    dotColor: '#f59e0b',
    bgColor: 'rgba(245, 158, 11, 0.1)',
    textColor: '#fbbf24',
  },
  APPROVED: {
    label: 'Approved',
    dotColor: '#22c55e',
    bgColor: 'rgba(34, 197, 94, 0.15)',
    textColor: '#4ade80',
  },
  REJECTED: {
    label: 'Rejected',
    dotColor: '#ef4444',
    bgColor: 'rgba(239, 68, 68, 0.1)',
    textColor: '#f87171',
  },
  FAILED: {
    label: 'Failed',
    dotColor: '#ef4444',
    bgColor: 'rgba(239, 68, 68, 0.15)',
    textColor: '#f87171',
  },
};

interface StatusBadgeProps {
  status: DocumentStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status] ?? statusConfig.QUEUED;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-all duration-200',
        className
      )}
      style={{
        backgroundColor: config.bgColor,
        color: config.textColor,
      }}
    >
      <span
        className={cn('h-1.5 w-1.5 rounded-full', config.pulse && 'animate-pulse-subtle')}
        style={{ backgroundColor: config.dotColor }}
      />
      {config.label}
    </span>
  );
}
