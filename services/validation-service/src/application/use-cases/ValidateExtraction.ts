import { AppError } from '@distill/utils';
import { Extraction } from '@distill/types';
import { ValidationResult, ValidationRuleResult } from '../../domain/entities/ValidationResult';
import { ALL_RULES } from '../../domain/rules';
import { TenantConfigProvider } from '../ports/TenantConfigProvider.port';
import { ExtractionProvider } from '../ports/ExtractionProvider.port';
import { EventPublisher } from '../ports/EventPublisher.port';
import { ValidateExtractionRequest } from '../dto/ValidateExtractionRequest';

export class ValidateExtraction {
  constructor(
    private readonly configProvider: TenantConfigProvider,
    private readonly extractionProvider: ExtractionProvider,
    private readonly eventPublisher: EventPublisher,
    private readonly logger: any
  ) {}

  async execute(request: ValidateExtractionRequest, extractionDataPayload?: Extraction): Promise<ValidationResult> {
    const { tenantId, documentId, extractionId } = request;

    // 1. Fetch Extraction if not provided in payload
    let extraction = extractionDataPayload;
    if (!extraction) {
      extraction = await this.extractionProvider.getExtraction(tenantId, extractionId);
    }

    if (!extraction.data) {
      throw new AppError('Extraction data is empty', 'VALIDATION_ERROR', 400);
    }

    // 2. Fetch tenant config
    const config = await this.configProvider.getValidationConfig(tenantId);

    // 3. Filter rules
    const activeRules = ALL_RULES.filter(rule => !config.disabledRules.includes(rule.name));

    // 4. Run rules
    const ruleResults: ValidationRuleResult[] = [];
    for (const rule of activeRules) {
      try {
        const result = rule.validate(extraction.data, config);
        ruleResults.push(result);
      } catch (error: any) {
        this.logger.error({ rule: rule.name, error: error.message }, 'Rule execution failed');
        ruleResults.push({
          ruleName: rule.name,
          category: rule.category,
          severity: rule.severity,
          passed: false,
          message: `Rule execution crashed: ${error.message}`
        });
      }
    }

    // 5. Aggregate result and routing
    const result = ValidationResult.createFromRules(
      documentId,
      tenantId,
      extractionId,
      extraction.confidence,
      ruleResults,
      config.autoApproveThreshold,
      config.reviewThreshold
    );

    this.logger.info({
      documentId,
      tenantId,
      passed: result.passed,
      routing: result.routing,
      errorCount: result.errors.length,
      warningCount: result.warnings.length
    }, 'Validation completed');

    // 6. Publish event
    const event = {
      eventId: Date.now().toString(),
      eventType: result.routing === 'AUTO_APPROVED' ? 'ValidationCompletedEvent' : 'ValidationNeedsReviewEvent',
      timestamp: new Date().toISOString(),
      tenantId,
      documentId,
      extractionId,
      routing: result.routing,
      overallConfidence: result.overallConfidence,
      passed: result.passed
    };

    const routingKey = result.routing === 'AUTO_APPROVED' 
      ? `validation.completed.invoice` 
      : `validation.needs_review.invoice`;

    await this.eventPublisher.publish('validation.exchange', routingKey, event as any);

    return result;
  }
}
