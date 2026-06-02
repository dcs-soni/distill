export interface TenantValidationConfig {
  autoApproveThreshold: number;
  reviewThreshold: number;
  fieldConfidenceMin: number;
  requiredFields: string[];
  disabledRules: string[];
  tolerances: {
    revenueVsProfit: number;
    assetsVsLiabilities: number;
  };
}

export const DEFAULT_VALIDATION_CONFIG: TenantValidationConfig = {
  autoApproveThreshold: 0.9,
  reviewThreshold: 0.7,
  fieldConfidenceMin: 0.6,
  requiredFields: ['companyName', 'fiscalYear', 'revenue'],
  disabledRules: [],
  tolerances: {
    revenueVsProfit: 0.05,
    assetsVsLiabilities: 0.1,
  },
};
