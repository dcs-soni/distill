import { FinancialData } from '@distill/types';
import { TenantValidationConfig } from '../value-objects/TenantValidationConfig';
import { ValidationRule, RuleResult } from './ValidationRule';

export class RevenueIsNumber implements ValidationRule {
  readonly name = 'RevenueIsNumber';
  readonly category = 'format';
  readonly severity = 'error';
  readonly description = 'Revenue must be a valid finite number if present';

  validate(extraction: FinancialData, _config: TenantValidationConfig): RuleResult {
    const passed = extraction.revenue === null || extraction.revenue === undefined || 
                  (typeof extraction.revenue === 'number' && Number.isFinite(extraction.revenue));
    return {
      ruleName: this.name,
      category: this.category,
      severity: this.severity,
      passed,
      message: passed ? 'Revenue is a valid number' : 'Revenue must be a finite number',
      field: 'revenue',
      actual: extraction.revenue
    };
  }
}

export class FiscalYearFormat implements ValidationRule {
  readonly name = 'FiscalYearFormat';
  readonly category = 'format';
  readonly severity = 'error';
  readonly description = 'Fiscal year must match YYYY or YYYY-YY format';

  validate(extraction: FinancialData, _config: TenantValidationConfig): RuleResult {
    const regex = /^(\d{4}|\d{4}-\d{2})$/;
    const passed = !extraction.fiscalYear || regex.test(extraction.fiscalYear.trim());
    return {
      ruleName: this.name,
      category: this.category,
      severity: this.severity,
      passed,
      message: passed ? 'Fiscal year format is valid' : 'Fiscal year must match YYYY or YYYY-YY format',
      field: 'fiscalYear',
      actual: extraction.fiscalYear
    };
  }
}

export class CurrencyCodeValid implements ValidationRule {
  readonly name = 'CurrencyCodeValid';
  readonly category = 'format';
  readonly severity = 'error';
  readonly description = 'Currency code must be a known 3-letter ISO code if present';
  
  // Common codes, not exhaustive for brevity but covers most enterprise use cases
  private readonly validCodes = new Set(['USD', 'EUR', 'GBP', 'INR', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'SGD', 'NZD']);

  validate(extraction: FinancialData, _config: TenantValidationConfig): RuleResult {
    const passed = !extraction.currency || this.validCodes.has(extraction.currency.toUpperCase());
    return {
      ruleName: this.name,
      category: this.category,
      severity: this.severity,
      passed,
      message: passed ? 'Currency code is valid' : `Currency code must be a known ISO 4217 code`,
      field: 'currency',
      actual: extraction.currency
    };
  }
}

export class CompanyNameNotEmpty implements ValidationRule {
  readonly name = 'CompanyNameNotEmpty';
  readonly category = 'format';
  readonly severity = 'error';
  readonly description = 'Company name must not be empty or "N/A"';

  validate(extraction: FinancialData, _config: TenantValidationConfig): RuleResult {
    const val = extraction.companyName?.trim().toLowerCase();
    const passed = !val || (val.length > 0 && val !== 'n/a' && val !== 'unknown');
    return {
      ruleName: this.name,
      category: this.category,
      severity: this.severity,
      passed,
      message: passed ? 'Company name is valid' : 'Company name is empty or explicitly unknown',
      field: 'companyName',
      actual: extraction.companyName
    };
  }
}

export class NumbersArePositive implements ValidationRule {
  readonly name = 'NumbersArePositive';
  readonly category = 'format';
  readonly severity = 'warning';
  readonly description = 'Revenue and total assets should typically be positive numbers';

  validate(extraction: FinancialData, _config: TenantValidationConfig): RuleResult {
    let passed = true;
    let msg = 'Numbers are positive';
    
    if (typeof extraction.revenue === 'number' && extraction.revenue < 0) {
      passed = false;
      msg = 'Revenue is negative';
    }
    
    if (typeof extraction.totalAssets === 'number' && extraction.totalAssets < 0) {
      passed = false;
      msg = 'Total assets is negative';
    }

    return {
      ruleName: this.name,
      category: this.category,
      severity: this.severity,
      passed,
      message: msg
    };
  }
}
