import { ValidationRule } from './ValidationRule';
import { RevenueIsNumber, FiscalYearFormat, CurrencyCodeValid, CompanyNameNotEmpty, NumbersArePositive } from './FormatRules';
import { RevenueGteProfit, AssetsApproxLiabilitiesEquity, EbitdaGteProfit, FiscalYearReasonable, RevenueNotZeroIfProfitExists } from './CrossFieldRules';
import { RequiredFieldsPresent, MinimumFieldCount, NoCriticalNulls, MinOverallConfidence, MinFieldConfidence, HighConfidenceAutoApprove } from './CompletenessAndConfidenceRules';

export const ALL_RULES: ValidationRule[] = [
  // Format
  new RevenueIsNumber(),
  new FiscalYearFormat(),
  new CurrencyCodeValid(),
  new CompanyNameNotEmpty(),
  new NumbersArePositive(),
  // Cross-field
  new RevenueGteProfit(),
  new AssetsApproxLiabilitiesEquity(),
  new EbitdaGteProfit(),
  new FiscalYearReasonable(),
  new RevenueNotZeroIfProfitExists(),
  // Completeness
  new RequiredFieldsPresent(),
  new MinimumFieldCount(),
  new NoCriticalNulls(),
  // Confidence
  new MinOverallConfidence(),
  new MinFieldConfidence(),
  new HighConfidenceAutoApprove(),
];

export * from './ValidationRule';
export * from './FormatRules';
export * from './CrossFieldRules';
export * from './CompletenessAndConfidenceRules';
