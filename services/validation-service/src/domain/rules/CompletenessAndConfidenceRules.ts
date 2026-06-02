import { FinancialData } from '@distill/types';
import { TenantValidationConfig } from '../value-objects/TenantValidationConfig';
import { ValidationRule, RuleResult } from './ValidationRule';

// --- Completeness Rules ---

export class RequiredFieldsPresent implements ValidationRule {
  readonly name = 'RequiredFieldsPresent';
  readonly category = 'completeness';
  readonly severity = 'error';
  readonly description = 'All fields required by tenant config must be present';

  validate(extraction: FinancialData, config: TenantValidationConfig): RuleResult {
    const missing: string[] = [];
    
    for (const field of config.requiredFields) {
      const val = (extraction as any)[field];
      if (val === null || val === undefined || val === '') {
        missing.push(field);
      }
    }

    const passed = missing.length === 0;

    return {
      ruleName: this.name,
      category: this.category,
      severity: this.severity,
      passed,
      message: passed ? 'All required fields present' : `Missing required fields: ${missing.join(', ')}`,
      expected: config.requiredFields,
      actual: missing
    };
  }
}

export class MinimumFieldCount implements ValidationRule {
  readonly name = 'MinimumFieldCount';
  readonly category = 'completeness';
  readonly severity = 'warning';
  readonly description = 'At least a certain number of fields should be extracted (default 5)';

  validate(extraction: FinancialData, _config: TenantValidationConfig): RuleResult {
    const fieldsToCheck = [
      extraction.companyName, extraction.fiscalYear, extraction.revenue, 
      extraction.netProfit, extraction.ebitda, extraction.totalAssets, 
      extraction.totalLiabilities, extraction.currency
    ];
    
    const presentCount = fieldsToCheck.filter(v => v !== null && v !== undefined && v !== '').length;
    const passed = presentCount >= 5;

    return {
      ruleName: this.name,
      category: this.category,
      severity: this.severity,
      passed,
      message: passed ? 'Minimum field count met' : `Only ${presentCount} fields extracted, minimum is 5`,
      expected: 5,
      actual: presentCount
    };
  }
}

export class NoCriticalNulls implements ValidationRule {
  readonly name = 'NoCriticalNulls';
  readonly category = 'completeness';
  readonly severity = 'error';
  readonly description = 'Critical identity fields (companyName, fiscalYear) must never be null';

  validate(extraction: FinancialData, _config: TenantValidationConfig): RuleResult {
    const passed = !!extraction.companyName && !!extraction.fiscalYear;
    
    return {
      ruleName: this.name,
      category: this.category,
      severity: this.severity,
      passed,
      message: passed ? 'No critical nulls' : 'Missing company name or fiscal year',
    };
  }
}

// --- Confidence Rules ---

export class MinOverallConfidence implements ValidationRule {
  readonly name = 'MinOverallConfidence';
  readonly category = 'confidence';
  readonly severity = 'warning';
  readonly description = 'Overall confidence must meet the tenant review threshold';

  validate(extraction: FinancialData, config: TenantValidationConfig): RuleResult {
    const passed = extraction.confidenceScore >= config.reviewThreshold;
    return {
      ruleName: this.name,
      category: this.category,
      severity: this.severity,
      passed,
      message: passed ? 'Confidence meets review threshold' : `Confidence ${extraction.confidenceScore} is below threshold ${config.reviewThreshold}`,
      expected: `>= ${config.reviewThreshold}`,
      actual: extraction.confidenceScore
    };
  }
}

export class MinFieldConfidence implements ValidationRule {
  readonly name = 'MinFieldConfidence';
  readonly category = 'confidence';
  readonly severity = 'info';
  readonly description = 'Each field confidence should meet the tenant minimum';

  validate(extraction: FinancialData, config: TenantValidationConfig): RuleResult {
    const lowConfidenceFields: string[] = [];
    
    if (extraction.fieldConfidences) {
      for (const [field, conf] of Object.entries(extraction.fieldConfidences)) {
        if (conf < config.fieldConfidenceMin) {
          lowConfidenceFields.push(`${field} (${conf})`);
        }
      }
    }

    const passed = lowConfidenceFields.length === 0;

    return {
      ruleName: this.name,
      category: this.category,
      severity: this.severity,
      passed,
      message: passed ? 'All fields meet minimum confidence' : `Low confidence fields: ${lowConfidenceFields.join(', ')}`,
    };
  }
}

export class HighConfidenceAutoApprove implements ValidationRule {
  readonly name = 'HighConfidenceAutoApprove';
  readonly category = 'confidence';
  readonly severity = 'info';
  readonly description = 'Check if extraction qualifies for auto-approval based on confidence';

  validate(extraction: FinancialData, config: TenantValidationConfig): RuleResult {
    const overallPassed = extraction.confidenceScore >= config.autoApproveThreshold;
    
    let allFieldsPassed = true;
    if (extraction.fieldConfidences) {
      for (const conf of Object.values(extraction.fieldConfidences)) {
        if (conf < 0.80) { // Hardcoded 0.80 per M5 spec
          allFieldsPassed = false;
          break;
        }
      }
    }

    const passed = overallPassed && allFieldsPassed;

    return {
      ruleName: this.name,
      category: this.category,
      severity: this.severity,
      passed,
      message: passed ? 'Eligible for auto-approve' : 'Does not meet auto-approve confidence threshold',
    };
  }
}
