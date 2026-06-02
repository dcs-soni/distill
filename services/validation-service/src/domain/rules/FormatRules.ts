import { Extraction } from '@distill/types';
import { TenantValidationConfig } from '../value-objects/TenantValidationConfig';
import { ValidationRule, RuleResult } from './ValidationRule';

export class RevenueIsNumber implements ValidationRule {
  readonly name = 'RevenueIsNumber';
  readonly category = 'format';
  readonly severity = 'error';
  readonly description = 'Revenue must be a valid finite number if present';

  validate(extraction: Extraction, _config: TenantValidationConfig): RuleResult {
    const revenueVal = extraction.data?.revenue?.value;
    const passed =
      revenueVal === null ||
      revenueVal === undefined ||
      (typeof revenueVal === 'number' && Number.isFinite(revenueVal));
    return {
      ruleName: this.name,
      category: this.category,
      severity: this.severity,
      passed,
      message: passed ? 'Revenue is a valid number' : 'Revenue must be a finite number',
      field: 'revenue',
      actual: revenueVal,
    };
  }
}

export class FiscalYearFormat implements ValidationRule {
  readonly name = 'FiscalYearFormat';
  readonly category = 'format';
  readonly severity = 'error';
  readonly description = 'Fiscal year must match YYYY or YYYY-YY format';

  validate(extraction: Extraction, _config: TenantValidationConfig): RuleResult {
    const regex = /^(\d{4}|\d{4}-\d{2})$/;
    const fiscalYearStr = extraction.data?.fiscalYear?.value as string | undefined;
    const passed = !fiscalYearStr || regex.test(fiscalYearStr.trim());
    return {
      ruleName: this.name,
      category: this.category,
      severity: this.severity,
      passed,
      message: passed
        ? 'Fiscal year format is valid'
        : 'Fiscal year must match YYYY or YYYY-YY format',
      field: 'fiscalYear',
      actual: fiscalYearStr,
    };
  }
}

export class CurrencyCodeValid implements ValidationRule {
  readonly name = 'CurrencyCodeValid';
  readonly category = 'format';
  readonly severity = 'error';
  readonly description = 'Currency code must be a known 3-letter ISO code if present';

  // Common codes, not exhaustive for brevity but covers most enterprise use cases
  private readonly validCodes = new Set([
    'USD',
    'EUR',
    'GBP',
    'INR',
    'JPY',
    'CAD',
    'AUD',
    'CHF',
    'CNY',
    'SGD',
    'NZD',
  ]);

  validate(extraction: Extraction, _config: TenantValidationConfig): RuleResult {
    const currencyStr = extraction.data?.currency?.value as string | undefined;
    const passed = !currencyStr || this.validCodes.has(currencyStr.toUpperCase());
    return {
      ruleName: this.name,
      category: this.category,
      severity: this.severity,
      passed,
      message: passed ? 'Currency code is valid' : `Currency code must be a known ISO 4217 code`,
      field: 'currency',
      actual: currencyStr,
    };
  }
}

export class CompanyNameNotEmpty implements ValidationRule {
  readonly name = 'CompanyNameNotEmpty';
  readonly category = 'format';
  readonly severity = 'error';
  readonly description = 'Company name must not be empty or "N/A"';

  validate(extraction: Extraction, _config: TenantValidationConfig): RuleResult {
    const companyNameStr = extraction.data?.companyName?.value as string | undefined;
    const val = companyNameStr?.trim().toLowerCase();
    const passed = !val || (val.length > 0 && val !== 'n/a' && val !== 'unknown');
    return {
      ruleName: this.name,
      category: this.category,
      severity: this.severity,
      passed,
      message: passed ? 'Company name is valid' : 'Company name is empty or explicitly unknown',
      field: 'companyName',
      actual: companyNameStr,
    };
  }
}

export class NumbersArePositive implements ValidationRule {
  readonly name = 'NumbersArePositive';
  readonly category = 'format';
  readonly severity = 'warning';
  readonly description = 'Revenue and total assets should typically be positive numbers';

  validate(extraction: Extraction, _config: TenantValidationConfig): RuleResult {
    let passed = true;
    let msg = 'Numbers are positive';

    const rev = extraction.data?.revenue?.value;
    const assets = extraction.data?.totalAssets?.value;

    if (typeof rev === 'number' && rev < 0) {
      passed = false;
      msg = 'Revenue is negative';
    }

    if (typeof assets === 'number' && assets < 0) {
      passed = false;
      msg = 'Total assets is negative';
    }

    return {
      ruleName: this.name,
      category: this.category,
      severity: this.severity,
      passed,
      message: msg,
    };
  }
}
