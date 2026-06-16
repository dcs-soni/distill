import apiClient from './api-client.js';

export interface DashboardMetricsResult {
  totalDocuments: {
    today: number;
    week: number;
    month: number;
    allTime: number;
  };
  statusDistribution: Record<string, number>;
  averageConfidence: number;
  averageProcessingTimeMs: number;
  successRate: number;
}

export interface AccuracyDataPoint {
  date: string;
  accuracy: number;
}

export interface AccuracyReportResult {
  overallAccuracy: number;
  accuracyOverTime: AccuracyDataPoint[];
  byDocType: Record<string, number>;
  byProvider: Record<string, number>;
}

export interface CostDataPoint {
  date: string;
  [key: string]: string | number;
}

export interface CostReportResult {
  totalCost: number;
  monthlyBurnRate: number;
  costByDocType: Record<string, number>;
  costByProvider: Record<string, number>;
  costOverTime: CostDataPoint[];
}

export interface ThroughputDataPoint {
  date: string;
  count: number;
}

export interface ThroughputReportResult {
  throughputOverTime: ThroughputDataPoint[];
}

export const getDashboardMetrics = async (): Promise<DashboardMetricsResult> => {
  const { data } = await apiClient.get<DashboardMetricsResult>('/analytics/dashboard');
  return data;
};

export const getAccuracyReport = async (): Promise<AccuracyReportResult> => {
  const { data } = await apiClient.get<AccuracyReportResult>('/analytics/reports/accuracy');
  return data;
};

export const getCostReport = async (): Promise<CostReportResult> => {
  const { data } = await apiClient.get<CostReportResult>('/analytics/reports/cost');
  return data;
};

export const getThroughputReport = async (): Promise<ThroughputReportResult> => {
  const { data } = await apiClient.get<ThroughputReportResult>('/analytics/reports/throughput');
  return data;
};
