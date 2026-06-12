import { describe, it, expect, vi, beforeEach } from 'vitest';
import { startConsumer } from '../../../../src/infrastructure/messaging/MetricsConsumer.js';
import { RecordDocumentMetrics } from '../../../../src/application/use-cases/RecordDocumentMetrics.js';
import { RecordReviewMetrics } from '../../../../src/application/use-cases/RecordReviewMetrics.js';

// Mock dependencies
vi.mock('@distill/utils', () => {
  return {
    RabbitMQClient: vi.fn().mockImplementation(() => ({
      connect: vi.fn().mockResolvedValue(undefined),
      assertTopology: vi.fn().mockResolvedValue(undefined),
      createConsumer: vi.fn(),
    })),
    ContextLogger: vi.fn(),
    logger: {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
    },
  };
});

describe('MetricsConsumer', () => {
  let mockRecordDocumentMetrics: any;
  let mockRecordReviewMetrics: any;

  beforeEach(() => {
    mockRecordDocumentMetrics = { execute: vi.fn() };
    mockRecordReviewMetrics = { execute: vi.fn() };
    vi.clearAllMocks();
  });

  it('should start and set up consumer', async () => {
    await startConsumer(
      mockRecordDocumentMetrics as unknown as RecordDocumentMetrics,
      mockRecordReviewMetrics as unknown as RecordReviewMetrics
    );

    const utils = await import('@distill/utils');
    expect(utils.RabbitMQClient).toHaveBeenCalled();
  });

  it('should process extraction.completed event', async () => {
    const utils = await import('@distill/utils');
    let consumerCallback: any;

    vi.mocked(utils.RabbitMQClient).mockImplementationOnce(
      () =>
        ({
          connect: vi.fn().mockResolvedValue(undefined),
          assertTopology: vi.fn().mockResolvedValue(undefined),
          createConsumer: vi.fn().mockImplementation((queue, cb) => {
            consumerCallback = cb;
          }),
        }) as any
    );

    await startConsumer(
      mockRecordDocumentMetrics as unknown as RecordDocumentMetrics,
      mockRecordReviewMetrics as unknown as RecordReviewMetrics
    );

    const event = {
      eventType: 'extraction.completed',
      tenantId: 'tenant-1',
      payload: {
        documentId: 'doc-1',
        confidenceScore: 0.85,
      },
    };

    await consumerCallback(event);

    expect(mockRecordDocumentMetrics.execute).toHaveBeenCalledWith({
      tenantId: 'tenant-1',
      documentId: 'doc-1',
      status: 'EXTRACTION_COMPLETED',
      extractionConfidence: 0.85,
      extractionLatencyMs: undefined,
      costUsd: undefined,
    });
  });
});
