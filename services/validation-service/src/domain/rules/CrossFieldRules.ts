import { FinancialData } from '@distill/types';
import { TenantValidationConfig } from '../value-objects/TenantValidationConfig';
import { ValidationRule, RuleResult } from './ValidationRule';

export class RevenueGteProfit implements ValidationRule {
  readonly name = 'RevenueGteProfit';
  readonly category = 'cross_field';
  readonly severity = 'warning';
  readonly description = 'Revenue should generally be greater than or equal to net profit';

  validate(extraction: FinancialData, config: TenantValidationConfig): RuleResult {
    if (typeof extraction.revenue !== 'number' || typeof extraction.netProfit !== 'number') {
      return { ruleName: this.name, category: this.category, severity: this.severity, passed: true, message: 'Missing data for comparison' };
    }

    // Profit can be slightly larger due to non-operating income, allow configurable tolerance
    const tolerance = config.tolerances.revenueVsProfit;
    const maxProfit = extraction.revenue * (1 + tolerance);
    
    const passed = extraction.netProfit <= maxProfit;
    
    return {
      ruleName: this.name,
      category: this.category,
      severity: this.severity,
      passed,
      message: passed ? 'Revenue >= Net Profit (within tolerance)' : 'Net Profit exceeds Revenue by more than tolerance',
      expected: `<= ${maxProfit}`,
      actual: extraction.netProfit
    };
  }
}

export class AssetsApproxLiabilitiesEquity implements ValidationRule {
  readonly name = 'AssetsApproxLiabilitiesEquity';
  readonly category = 'cross_field';
  readonly severity = 'warning';
  readonly description = 'Total Assets should roughly equal Total Liabilities (simplified without Equity)';

  validate(extraction: FinancialData, config: TenantValidationConfig): RuleResult {
    if (typeof extraction.totalAssets !== 'number' || typeof extraction.totalLiabilities !== 'number') {
      return { ruleName: this.name, category: this.category, severity: this.severity, passed: true, message: 'Missing data' };
    }
    
    // In reality Assets = Liabilities + Equity, so Liabilities should be <= Assets
    // We check if Liabilities > Assets * (1 + tolerance)
    const passed = extraction.totalLiabilities <= extraction.totalAssets * (1 + config.tolerances.assetsVsLiabilities);

    return {
      ruleName: this.name,
      category: this.category,
      severity: this.severity,
      passed,
      message: passed ? 'Liabilities are reasonable compared to Assets' : 'Liabilities exceed Assets significantly',
      actual: { assets: extraction.totalAssets, liabilities: extraction.totalLiabilities }
    };
  }
}

export class EbitdaGteProfit implements ValidationRule {
  readonly name = 'EbitdaGteProfit';
  readonly category = 'cross_field';
  readonly severity = 'warning';
  readonly description = 'EBITDA should generally be greater than or equal to Net Profit';

  validate(extraction: FinancialData, _config: TenantValidationConfig): RuleResult {
    if (typeof extraction.ebitda !== 'number' || typeof extraction.netProfit !== 'number') {
      return { ruleName: this.name, category: this.category, severity: this.severity, passed: true, message: 'Missing data' };
    }
    
    const passed = extraction.ebitda >= extraction.netProfit;

    return {
      ruleName: this.name,
      category: this.category,
      severity: this.severity,
      passed,
      message: passed ? 'EBITDA >= Net Profit' : 'EBITDA is less than Net Profit',
      actual: { ebitda: extraction.ebitda, profit: extraction.netProfit }
    };
  }
}

export class FiscalYearReasonable implements ValidationRule {
  readonly name = 'FiscalYearReasonable';
  readonly category = 'cross_field';
  readonly severity = 'error';
  readonly description = 'Fiscal year should be within the last 10 years';

  validate(extraction: FinancialData, _config: TenantValidationConfig): RuleResult {
    if (!extraction.fiscalYear) {
      return { ruleName: this.name, category: this.category, severity: this.severity, passed: true, message: 'No fiscal year' };
    }
    
    const yearMatch = extraction.fiscalYear.match(/^(\d{4})/);
    if (!yearMatch) {
      return { ruleName: this.name, category: this.category, severity: this.severity, passed: true, message: 'Cannot parse year' };
    }
    
    const year = parseInt(yearMatch[1], 10);
    const currentYear = new Date().getFullYear();
    const passed = year >= currentYear - 10 && year <= currentYear + 1; // Allow +1 for forward-looking years

    return {
      ruleName: this.name,
      category: this.category,
      severity: this.severity,
      passed,
      message: passed ? 'Fiscal year is reasonable' : `Fiscal year ${year} is out of reasonable range`,
      field: 'fiscalYear',
      actual: extraction.fiscalYear
    };
  }
}

export class RevenueNotZeroIfProfitExists implements ValidationRule {
  readonly name = 'RevenueNotZeroIfProfitExists';
  readonly category = 'cross_field';
  readonly severity = 'warning';
  readonly description = 'If Net Profit > 0, Revenue should typically not be exactly 0';

  validate(extraction: FinancialData, _config: TenantValidationConfig): RuleResult {
    if (typeof extraction.revenue !== 'number' || typeof extraction.netProfit !== 'number') {
      return { ruleName: this.name, category: this.category, severity: this.severity, passed: true, message: 'Missing data' };
    }
    
    const passed = !(extraction.netProfit > 0 && extraction.revenue === 0);

    return {
      ruleName: this.name,
      category: this.category,
      severity: this.severity,
      passed,
      message: passed ? 'Valid logic' : 'Revenue is 0 but Net Profit is positive',
    };
  }
}
