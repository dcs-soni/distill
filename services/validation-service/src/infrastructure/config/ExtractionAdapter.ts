import { ExtractionProvider } from '../../application/ports/ExtractionProvider.port';
import { Extraction } from '@distill/types';
import { AppError } from '@distill/utils';
import { Logger } from '../../application/use-cases/ValidateExtraction';

export class ExtractionAdapter implements ExtractionProvider {
  constructor(
    private readonly extractionServiceUrl: string,
    private readonly logger: Logger
  ) {}

  async getExtraction(tenantId: string, extractionId: string): Promise<Extraction> {
    try {
      const response = await fetch(`${this.extractionServiceUrl}/api/extractions/${extractionId}`, {
        headers: {
          'X-Internal-Service': 'validation-service',
          'X-Tenant-Id': tenantId,
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new AppError(`Extraction ${extractionId} not found`, 'NOT_FOUND', 404);
        }
        throw new Error(`Extraction service returned ${response.status}`);
      }

      const data = (await response.json()) as unknown;
      return data as Extraction;
    } catch (err: unknown) {
      const error = err as Error;
      this.logger.error(
        { error: error.message, tenantId, extractionId },
        'Failed to fetch extraction data'
      );
      throw new AppError(
        `Failed to fetch extraction: ${error.message}`,
        'EXTERNAL_SERVICE_ERROR',
        502
      );
    }
  }
}
