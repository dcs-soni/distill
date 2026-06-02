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
  autoApproveThreshold: 0.90,
  reviewThreshold: 0.70,
  fieldConfidenceMin: 0.60,
  requiredFields: ['companyName', 'fiscalYear', 'revenue'],
  disabledRules: [],
  tolerances: {
    revenueVsProfit: 0.05,
    assetsVsLiabilities: 0.10,
  }
};
