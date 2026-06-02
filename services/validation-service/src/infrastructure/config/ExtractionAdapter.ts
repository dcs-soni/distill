import { ExtractionProvider } from '../../application/ports/ExtractionProvider.port';
import { Extraction } from '@distill/types';
import { AppError } from '@distill/utils';

export class ExtractionAdapter implements ExtractionProvider {
  constructor(
    private readonly extractionServiceUrl: string,
    private readonly logger: any
  ) {}

  async getExtraction(tenantId: string, extractionId: string): Promise<Extraction> {
    try {
      const response = await fetch(`${this.extractionServiceUrl}/api/extractions/${extractionId}`, {
        headers: {
          'X-Internal-Service': 'validation-service',
          'X-Tenant-Id': tenantId
        }
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new AppError(`Extraction ${extractionId} not found`, 'NOT_FOUND', 404);
        }
        throw new Error(`Extraction service returned ${response.status}`);
      }

      const data = await response.json();
      return data as Extraction;
    } catch (error: any) {
      this.logger.error({ error: error.message, tenantId, extractionId }, 'Failed to fetch extraction data');
      throw new AppError(`Failed to fetch extraction: ${error.message}`, 'EXTERNAL_SERVICE_ERROR', 502);
    }
  }
}
