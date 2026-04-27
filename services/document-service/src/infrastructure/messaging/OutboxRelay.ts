import { logger } from '@distill/utils';
import type { EventPublisher } from '../../application/ports/EventPublisher.port.js';
import type { DomainEvent } from '@distill/types';
import type { PrismaClient } from '../persistence/generated/client/index.js';

/** Maximum number of relay attempts before an outbox event is marked FAILED. */
const MAX_RELAY_ATTEMPTS = 5;

/**
 * OutboxRelay polls the `outbox_events` table for PENDING events and
 * publishes them to the message broker. This guarantees at-least-once
 * delivery even when the inline publish in UploadDocument fails.
 *
 * Design decisions:
 * - Accepts PrismaClient via constructor for testability (no module singleton).
 * - Limits retries per event to MAX_RELAY_ATTEMPTS to prevent infinite loops.
 * - Events exceeding the retry limit are transitioned to FAILED with the
 *   last error message recorded for ops visibility.
 * - Processes events in creation order (FIFO) with a configurable batch size.
 */
export class OutboxRelay {
  private intervalId?: ReturnType<typeof setInterval>;

  constructor(
    private readonly prisma: PrismaClient,
    private readonly publisher: EventPublisher,
    private readonly intervalMs: number = 5000,
    private readonly batchSize: number = 50
  ) {}

  start(): void {
    if (this.intervalId) return;
    this.intervalId = setInterval(() => {
      this.processOutbox().catch((err) => logger.error(err, 'Unhandled error in Outbox Relay'));
    }, this.intervalMs);
    logger.info({ intervalMs: this.intervalMs }, 'Outbox Relay started');
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
    logger.info('Outbox Relay stopped');
  }

  private async processOutbox(): Promise<void> {
    try {
      const events = await this.prisma.outboxEvent.findMany({
        where: { status: 'PENDING' },
        take: this.batchSize,
        orderBy: { createdAt: 'asc' },
      });

      for (const event of events) {
        const currentRetry = (event.retryCount ?? 0) + 1;

        try {
          await this.publisher.publish(
            event.exchange,
            event.routingKey,
            event.payload as unknown as DomainEvent
          );

          await this.prisma.outboxEvent.update({
            where: { id: event.id },
            data: {
              status: 'PUBLISHED',
              error: null,
              retryCount: currentRetry,
            },
          });
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : String(err);

          if (currentRetry >= MAX_RELAY_ATTEMPTS) {
            // Exhausted all retries — mark as permanently FAILED so it stops
            // being picked up. Ops can investigate and manually re-queue.
            logger.error(
              { eventId: event.id, retryCount: currentRetry, error: errorMsg },
              'Outbox event exceeded max relay attempts — marked FAILED'
            );
            await this.prisma.outboxEvent.update({
              where: { id: event.id },
              data: {
                status: 'FAILED',
                error: `Exhausted ${MAX_RELAY_ATTEMPTS} relay attempts. Last error: ${errorMsg}`,
                retryCount: currentRetry,
              },
            });
          } else {
            logger.warn(
              { eventId: event.id, retryCount: currentRetry, error: errorMsg },
              'Outbox relay publish failed — will retry'
            );
            await this.prisma.outboxEvent.update({
              where: { id: event.id },
              data: {
                error: errorMsg,
                retryCount: currentRetry,
              },
            });
          }
        }
      }
    } catch (err) {
      logger.error(err, 'Error in Outbox Relay process loop');
    }
  }
}
