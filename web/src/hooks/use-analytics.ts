import { useQuery } from '@tanstack/react-query';
import {
  getDashboardMetrics,
  getAccuracyReport,
  getCostReport,
  getThroughputReport,
} from '../services/analytics-api.js';

export const analyticsKeys = {
  all: ['analytics'] as const,
  dashboard: () => [...analyticsKeys.all, 'dashboard'] as const,
  accuracy: () => [...analyticsKeys.all, 'accuracy'] as const,
  cost: () => [...analyticsKeys.all, 'cost'] as const,
  throughput: () => [...analyticsKeys.all, 'throughput'] as const,
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

export function useCostReport() {
  return useQuery({
    queryKey: analyticsKeys.cost(),
    queryFn: getCostReport,
    refetchInterval: 60000,
  });
}

export function useThroughputReport() {
  return useQuery({
    queryKey: analyticsKeys.throughput(),
    queryFn: getThroughputReport,
    refetchInterval: 60000,
  });
}
