import { useQuery } from '@tanstack/react-query';
import { getDashboardMetrics, getAccuracyReport } from '../services/analytics-api.js';

export const analyticsKeys = {
  all: ['analytics'] as const,
  dashboard: () => [...analyticsKeys.all, 'dashboard'] as const,
  accuracy: () => [...analyticsKeys.all, 'accuracy'] as const,
};

export function useDashboardMetrics() {
  return useQuery({
    queryKey: analyticsKeys.dashboard(),
    queryFn: getDashboardMetrics,
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}

export function useAccuracyReport() {
  return useQuery({
    queryKey: analyticsKeys.accuracy(),
    queryFn: getAccuracyReport,
    refetchInterval: 60000, // Refetch every minute
  });
}
