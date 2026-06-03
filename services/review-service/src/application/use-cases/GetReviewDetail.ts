import { NotFoundError, ExternalServiceError } from '@distill/utils';
import type { ReviewRepository } from '../ports/ReviewRepository.port.js';

export class GetReviewDetail {
  constructor(private readonly reviewRepository: ReviewRepository) {}

  async execute(tenantId: string, reviewId: string) {
    const review = await this.reviewRepository.findById(tenantId, reviewId);
    if (!review) {
      throw new NotFoundError('Review not found');
    }

    // In a real microservice, we'd make HTTP calls to document-service and extraction-service here.
    // For this milestone, we use simple fetch to the other services.
    const documentServiceUrl = process.env.DOCUMENT_SERVICE_URL || 'http://localhost:3002';
    const extractionServiceUrl = process.env.EXTRACTION_SERVICE_URL || 'http://localhost:3003';

    try {
      // We pass the tenant ID via headers as the API gateway would
      const headers = {
        'X-Tenant-ID': tenantId,
        'X-User-Role': 'ADMIN', // Since this is a service-to-service call in absence of a true service mesh
      };

      const [docRes, extRes] = await Promise.all([
        fetch(`${documentServiceUrl}/api/documents/${review.documentId}`, { headers }),
        fetch(`${extractionServiceUrl}/api/extractions/${review.extractionId}`, { headers }),
      ]);

      let documentData = null;
      let extractionData = null;

      if (docRes.ok) {
        documentData = (await docRes.json()) as unknown;
      } else {
        throw new ExternalServiceError(`Failed to fetch document metadata: ${docRes.status}`);
      }

      if (extRes.ok) {
        extractionData = (await extRes.json()) as unknown;
      } else {
        throw new ExternalServiceError(`Failed to fetch extraction data: ${extRes.status}`);
      }

      return {
        review: review.toDTO(),
        document: documentData,
        extraction: extractionData,
      };
    } catch (err: unknown) {
      if (err instanceof NotFoundError || err instanceof ExternalServiceError) throw err;
      throw new ExternalServiceError(
        err instanceof Error ? err.message : 'Failed to fetch related data'
      );
    }
  }
}
