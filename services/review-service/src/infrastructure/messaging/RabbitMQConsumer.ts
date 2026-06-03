import { RabbitMQClient, ContextLogger, createLogger, logger } from '@distill/utils';
import type { ValidationNeedsReviewEvent } from '@distill/types';
import type { ReviewRepository } from '../../application/ports/ReviewRepository.port.js';
import { Review } from '../../domain/entities/Review.js';

export class RabbitMQConsumer {
  private client: RabbitMQClient;

  constructor(
    private readonly url: string,
    private readonly reviewRepository: ReviewRepository
  ) {
    const pinoLogger = createLogger({ service: 'review-service' });
    const contextLogger = new ContextLogger(pinoLogger, { component: 'rabbitmq' });
    this.client = new RabbitMQClient(this.url, contextLogger);
  }

  async start(): Promise<void> {
    await this.client.connect();

    await this.client.assertTopology({
      exchange: 'validation.exchange',
      queue: 'review.validation.needs_review',
      routingKey: 'validation.completed.needs_review',
    });

    await this.client.createConsumer<ValidationNeedsReviewEvent['payload']>(
      'review.validation.needs_review',
      async (event) => {
        logger.info({ eventId: event.eventId }, 'Received ValidationNeedsReviewEvent');

        // Idempotency check: does a review already exist for this document?
        const existing = await this.reviewRepository.findByDocumentId(
          event.tenantId,
          event.payload.documentId
        );
        if (existing) {
          logger.info(
            { documentId: event.payload.documentId },
            'Review already exists for document, skipping'
          );
          return; // ACK
        }

        // Determine priority based on overallConfidence (threshold could be configured, defaulting to 0.7)
        const priority = event.payload.confidenceScore < 0.7 ? 'HIGH' : 'NORMAL';

        const review = Review.create({
          id: event.eventId, // Usually we'd generate a new ID, but using event ID helps idempotency
          tenantId: event.tenantId,
          documentId: event.payload.documentId,
          extractionId: event.payload.extractionId,
          priority,
        });

        await this.reviewRepository.save(review);
        logger.info({ reviewId: review.id }, 'Created new review for document');
      },
      { prefetch: 10 }
    );

    logger.info('RabbitMQ consumer started for review service');
  }

  async stop(): Promise<void> {
    await this.client.close();
  }
}
