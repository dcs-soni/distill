import { FinancialData } from '@distill/types';
import { TenantValidationConfig } from '../value-objects/TenantValidationConfig';

export interface RuleResult {
  ruleName: string;
  category: 'format' | 'cross_field' | 'completeness' | 'confidence';
  severity: 'error' | 'warning' | 'info';
  passed: boolean;
  message: string;
  field?: string;
  expected?: unknown;
  actual?: unknown;
}

export interface ValidationRule {
  readonly name: string;
  readonly category: 'format' | 'cross_field' | 'completeness' | 'confidence';
  readonly severity: 'error' | 'warning' | 'info';
  readonly description: string;
  
  validate(extraction: FinancialData, config: TenantValidationConfig): RuleResult;
}
