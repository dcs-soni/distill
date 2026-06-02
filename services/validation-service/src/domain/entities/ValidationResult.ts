import { generateId } from '@distill/utils';

export type ValidationRouting = 'AUTO_APPROVED' | 'REVIEW' | 'PRIORITY_REVIEW';

export interface ValidationRuleResult {
  ruleName: string;
  category: string;
  severity: 'error' | 'warning' | 'info';
  passed: boolean;
  message: string;
  field?: string;
  expected?: unknown;
  actual?: unknown;
}

export interface ValidationResultProps {
  id?: string;
  documentId: string;
  tenantId: string;
  extractionId: string;
  passed: boolean;
  overallConfidence: number;
  ruleResults: ValidationRuleResult[];
  errors: ValidationRuleResult[];
  warnings: ValidationRuleResult[];
  infos: ValidationRuleResult[];
  routing: ValidationRouting;
  createdAt?: Date;
}

export class ValidationResult {
  readonly id: string;
  readonly documentId: string;
  readonly tenantId: string;
  readonly extractionId: string;
  readonly passed: boolean;
  readonly overallConfidence: number;
  readonly ruleResults: ValidationRuleResult[];
  readonly errors: ValidationRuleResult[];
  readonly warnings: ValidationRuleResult[];
  readonly infos: ValidationRuleResult[];
  readonly routing: ValidationRouting;
  readonly createdAt: Date;

  constructor(props: ValidationResultProps) {
    this.id = props.id || generateId();
    this.documentId = props.documentId;
    this.tenantId = props.tenantId;
    this.extractionId = props.extractionId;
    this.passed = props.passed;
    this.overallConfidence = props.overallConfidence;
    this.ruleResults = [...props.ruleResults];
    this.errors = [...props.errors];
    this.warnings = [...props.warnings];
    this.infos = [...props.infos];
    this.routing = props.routing;
    this.createdAt = props.createdAt || new Date();
  }

  hasCriticalErrors(): boolean {
    return this.errors.length > 0;
  }

  needsReview(threshold: number): boolean {
    return this.overallConfidence < threshold || this.hasCriticalErrors();
  }

  getRouting(): ValidationRouting {
    return this.routing;
  }

  static createFromRules(
    documentId: string,
    tenantId: string,
    extractionId: string,
    overallConfidence: number,
    ruleResults: ValidationRuleResult[],
    autoApproveThreshold: number,
    reviewThreshold: number
  ): ValidationResult {
    const errors = ruleResults.filter((r) => !r.passed && r.severity === 'error');
    const warnings = ruleResults.filter((r) => !r.passed && r.severity === 'warning');
    const infos = ruleResults.filter((r) => !r.passed && r.severity === 'info');

    const passed = errors.length === 0;

    let routing: ValidationRouting;

    if (errors.length > 0 || overallConfidence < reviewThreshold) {
      routing = 'PRIORITY_REVIEW';
    } else if (overallConfidence >= autoApproveThreshold && warnings.length === 0) {
      routing = 'AUTO_APPROVED';
    } else {
      routing = 'REVIEW';
    }

    return new ValidationResult({
      documentId,
      tenantId,
      extractionId,
      passed,
      overallConfidence,
      ruleResults,
      errors,
      warnings,
      infos,
      routing,
    });
  }
}
