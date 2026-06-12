import { RabbitMQClient } from '@distill/utils';
import { logger, ContextLogger } from '@distill/utils';
import type {
  ExtractionCompletedEvent,
  ValidationCompletedEvent,
  ValidationNeedsReviewEvent,
  ReviewCompletedEvent,
} from '@distill/types';
import { RecordDocumentMetrics } from '../../application/use-cases/RecordDocumentMetrics.js';
import { RecordReviewMetrics } from '../../application/use-cases/RecordReviewMetrics.js';

export const startConsumer = async (
  recordDocumentMetrics: RecordDocumentMetrics,
  recordReviewMetrics: RecordReviewMetrics
) => {
  const url = process.env.RABBITMQ_URL || 'amqp://admin:admin123@localhost:5672/distill';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
  const client = new RabbitMQClient(url, new ContextLogger(logger as any));

  await client.connect();

  const queue = 'analytics.metrics.queue';
  const dlx = 'dlx.exchange';

  const bindings = [
    { exchange: 'extraction.exchange', routingKey: 'extraction.completed.*' },
    { exchange: 'validation.exchange', routingKey: 'validation.completed.*' },
    { exchange: 'validation.exchange', routingKey: 'validation.needs_review.*' },
    { exchange: 'review.exchange', routingKey: 'review.completed.*' },
  ];

  // Assert topology
  await client.assertTopology({
    exchange: bindings[0].exchange,
    queue,
    routingKey: bindings[0].routingKey,
    dlx,
  });

  for (let i = 1; i < bindings.length; i++) {
    await client.assertTopology({
      exchange: bindings[i].exchange,
      queue,
      routingKey: bindings[i].routingKey,
      dlx,
    });
  }

  logger.info('Metrics Consumer connected to RabbitMQ and listening for events.');

  await client.createConsumer<Record<string, unknown>>(queue, async (event) => {
    logger.info({ eventType: event.eventType }, 'Metrics Consumer received event');

    switch (event.eventType) {
      case 'extraction.completed': {
        const ev = event as ExtractionCompletedEvent;
        await recordDocumentMetrics.execute({
          tenantId: ev.tenantId,
          documentId: ev.payload.documentId,
          status: 'EXTRACTION_COMPLETED',
          extractionConfidence: ev.payload.confidenceScore,
          extractionLatencyMs: undefined,
          costUsd: undefined,
        });
        break;
      }

      case 'validation.completed': {
        const ev = event as ValidationCompletedEvent;
        await recordDocumentMetrics.execute({
          tenantId: ev.tenantId,
          documentId: ev.payload.documentId,
          status: 'VALIDATION_COMPLETED',
        });
        break;
      }

      case 'validation.needs_review': {
        const ev = event as ValidationNeedsReviewEvent;
        await recordDocumentMetrics.execute({
          tenantId: ev.tenantId,
          documentId: ev.payload.documentId,
          status: 'NEEDS_REVIEW',
        });
        break;
      }

      case 'review.completed': {
        const ev = event as ReviewCompletedEvent;
        await recordDocumentMetrics.execute({
          tenantId: ev.tenantId,
          documentId: ev.payload.documentId,
          status: 'REVIEW_COMPLETED',
        });

        await recordReviewMetrics.execute({
          tenantId: ev.tenantId,
          reviewerId: 'unknown-reviewer',
          documentId: ev.payload.documentId,
          action: ev.payload.action,
          correctionsCount: 0,
          durationMs: 0,
        });
        break;
      }

      default:
        logger.warn({ eventType: event.eventType }, 'Unhandled event type in Metrics Consumer');
    }
  });
};
