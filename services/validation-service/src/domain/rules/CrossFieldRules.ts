import { Extraction } from '@distill/types';
import { TenantValidationConfig } from '../value-objects/TenantValidationConfig';
import { ValidationRule, RuleResult } from './ValidationRule';

export class RevenueGteProfit implements ValidationRule {
  readonly name = 'RevenueGteProfit';
  readonly category = 'cross_field';
  readonly severity = 'warning';
  readonly description = 'Revenue should generally be greater than or equal to net profit';

  validate(extraction: Extraction, config: TenantValidationConfig): RuleResult {
    const revenueVal = extraction.data?.revenue?.value as number | undefined;
    const profitVal = extraction.data?.netProfit?.value as number | undefined;

    if (
      revenueVal === undefined ||
      revenueVal === null ||
      profitVal === undefined ||
      profitVal === null
    ) {
      return {
        ruleName: this.name,
        category: this.category,
        severity: this.severity,
        passed: true,
        message: 'Missing data for comparison',
      };
    }

    // Profit can be slightly larger due to non-operating income, allow configurable tolerance
    const tolerance = config.tolerances?.revenueVsProfit ?? 0.05;
    const maxProfit = revenueVal * (1 + tolerance);

    const passed = profitVal <= maxProfit;

    return {
      ruleName: this.name,
      category: this.category,
      severity: this.severity,
      passed,
      message: passed
        ? 'Revenue >= Net Profit (within tolerance)'
        : 'Net Profit exceeds Revenue by more than tolerance',
      expected: `<= ${maxProfit}`,
      actual: profitVal,
    };
  }
}

export class AssetsApproxLiabilitiesEquity implements ValidationRule {
  readonly name = 'AssetsApproxLiabilitiesEquity';
  readonly category = 'cross_field';
  readonly severity = 'warning';
  readonly description =
    'Total Assets should roughly equal Total Liabilities (simplified without Equity)';

  validate(extraction: Extraction, config: TenantValidationConfig): RuleResult {
    const assets = extraction.data?.totalAssets?.value as number | undefined;
    const liabilities = extraction.data?.totalLiabilities?.value as number | undefined;

    if (
      assets === undefined ||
      assets === null ||
      liabilities === undefined ||
      liabilities === null
    ) {
      return {
        ruleName: this.name,
        category: this.category,
        severity: this.severity,
        passed: true,
        message: 'Missing data',
      };
    }

    // In reality Assets = Liabilities + Equity, so Liabilities should be <= Assets
    // We check if Liabilities > Assets * (1 + tolerance)
    const passed = liabilities <= assets * (1 + (config.tolerances.assetsVsLiabilities ?? 0));

    return {
      ruleName: this.name,
      category: this.category,
      severity: this.severity,
      passed,
      message: passed
        ? 'Liabilities are reasonable compared to Assets'
        : 'Liabilities exceed Assets significantly',
      actual: { assets, liabilities },
    };
  }
}

export class EbitdaGteProfit implements ValidationRule {
  readonly name = 'EbitdaGteProfit';
  readonly category = 'cross_field';
  readonly severity = 'warning';
  readonly description = 'EBITDA should generally be greater than or equal to Net Profit';

  validate(extraction: Extraction, _config: TenantValidationConfig): RuleResult {
    const ebitdaVal = extraction.data?.ebitda?.value as number | undefined;
    const profitVal = extraction.data?.netProfit?.value as number | undefined;

    if (
      ebitdaVal === undefined ||
      ebitdaVal === null ||
      profitVal === undefined ||
      profitVal === null
    ) {
      return {
        ruleName: this.name,
        category: this.category,
        severity: this.severity,
        passed: true,
        message: 'Missing data',
      };
    }

    const passed = ebitdaVal >= profitVal;

    return {
      ruleName: this.name,
      category: this.category,
      severity: this.severity,
      passed,
      message: passed ? 'EBITDA >= Net Profit' : 'EBITDA is less than Net Profit',
      actual: { ebitda: ebitdaVal, profit: profitVal },
    };
  }
}

export class FiscalYearReasonable implements ValidationRule {
  readonly name = 'FiscalYearReasonable';
  readonly category = 'cross_field';
  readonly severity = 'error';
  readonly description = 'Fiscal year should be within the last 10 years';

  validate(extraction: Extraction, _config: TenantValidationConfig): RuleResult {
    const fiscalYearStr = extraction.data?.fiscalYear?.value as string | undefined;
    if (!fiscalYearStr) {
      return {
        ruleName: this.name,
        category: this.category,
        severity: this.severity,
        passed: true,
        message: 'No fiscal year',
      };
    }

    const yearMatch = fiscalYearStr.match(/^(\d{4})/);
    if (!yearMatch) {
      return {
        ruleName: this.name,
        category: this.category,
        severity: this.severity,
        passed: true,
        message: 'Cannot parse year',
      };
    }

    const year = parseInt(yearMatch[1], 10);
    const currentYear = new Date().getFullYear();
    const passed = year >= currentYear - 10 && year <= currentYear + 1; // Allow +1 for forward-looking years

    return {
      ruleName: this.name,
      category: this.category,
      severity: this.severity,
      passed,
      message: passed
        ? 'Fiscal year is reasonable'
        : `Fiscal year ${year} is out of reasonable range`,
      field: 'fiscalYear',
      actual: extraction.data?.fiscalYear?.value,
    };
  }
}

export class RevenueNotZeroIfProfitExists implements ValidationRule {
  readonly name = 'RevenueNotZeroIfProfitExists';
  readonly category = 'cross_field';
  readonly severity = 'warning';
  readonly description = 'If Net Profit > 0, Revenue should typically not be exactly 0';

  validate(extraction: Extraction, _config: TenantValidationConfig): RuleResult {
    const revenueVal = extraction.data?.revenue?.value as number | undefined;
    const profitVal = extraction.data?.netProfit?.value as number | undefined;

    if (
      revenueVal === undefined ||
      revenueVal === null ||
      profitVal === undefined ||
      profitVal === null
    ) {
      return {
        ruleName: this.name,
        category: this.category,
        severity: this.severity,
        passed: true,
        message: 'Missing data',
      };
    }

    const passed = !(profitVal > 0 && revenueVal === 0);

    return {
      ruleName: this.name,
      category: this.category,
      severity: this.severity,
      passed,
      message: passed ? 'Valid logic' : 'Revenue is 0 but Net Profit is positive',
    };
  }
}
