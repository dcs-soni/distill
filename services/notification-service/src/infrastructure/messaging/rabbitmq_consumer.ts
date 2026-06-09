import { RabbitMQClient } from '@distill/utils/src/amqp.js';
import { logger, ContextLogger } from '@distill/utils/src/logger.js';
import { getIO } from '../web/SocketIOAdapter.js';
import type { DomainEvent } from '@distill/types';

import type pino from 'pino';

export const startConsumer = async () => {
  const url = process.env.RABBITMQ_URL || 'amqp://admin:admin_password@localhost:5672';
  const client = new RabbitMQClient(url, new ContextLogger(logger as unknown as pino.Logger));

  await client.connect();

  const queue = 'notification.events';
  const dlx = 'dlx.exchange';

  // We need to assert bindings for multiple exchanges
  const bindings = [
    { exchange: 'extraction.exchange', routingKey: 'extraction.completed.*' },
    { exchange: 'validation.exchange', routingKey: 'validation.completed.*' },
    { exchange: 'validation.exchange', routingKey: 'validation.needs_review.*' },
    { exchange: 'review.exchange', routingKey: 'review.completed.*' },
    { exchange: 'document.exchange', routingKey: 'document.failed.*' },
  ];

  // Initialize the queue with the first binding
  await client.assertTopology({
    exchange: bindings[0].exchange,
    queue,
    routingKey: bindings[0].routingKey,
    dlx,
  });

  // Since RabbitMQClient's assertTopology only takes one exchange/routingKey,
  // we can manually add more bindings if we had access to the channel,
  // but to keep it simple, we'll just loop and call assertTopology.
  // It's idempotent so it will just add the bindings.
  for (let i = 1; i < bindings.length; i++) {
    await client.assertTopology({
      exchange: bindings[i].exchange,
      queue,
      routingKey: bindings[i].routingKey,
      dlx,
    });
  }

  await client.createConsumer(
    queue,
    (event: DomainEvent<unknown>): Promise<void> => {
      logger.info({ eventId: event.eventId }, `Received event: ${event.eventType}`);

      const io = getIO();
      if (!io) {
        throw new Error('Socket.IO not initialized');
      }

      // Emit to tenant room
      const tenantRoom = `tenant:${event.tenantId}`;
      io.to(tenantRoom).emit('notification', {
        type: event.eventType,
        eventId: event.eventId,
        timestamp: event.timestamp,
        data: event.payload,
      });

      // Also emit to document specific room if documentId is present
      const payloadWithDocId = event.payload as { documentId?: string } | undefined;
      if (payloadWithDocId && payloadWithDocId.documentId) {
        const docRoom = `document:${payloadWithDocId.documentId}`;
        io.to(docRoom).emit('document_update', {
          type: event.eventType,
          eventId: event.eventId,
          timestamp: event.timestamp,
          data: event.payload,
        });
      }

      return Promise.resolve();
    },
    { prefetch: 10 }
  );

  logger.info('Notification RabbitMQ consumer started');
};
