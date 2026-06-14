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

export const getDashboardMetrics = async (): Promise<DashboardMetricsResult> => {
  const { data } = await apiClient.get<DashboardMetricsResult>('/analytics/dashboard');
  return data;
};

export const getAccuracyReport = async (): Promise<AccuracyReportResult> => {
  const { data } = await apiClient.get<AccuracyReportResult>('/analytics/reports/accuracy');
  return data;
};
