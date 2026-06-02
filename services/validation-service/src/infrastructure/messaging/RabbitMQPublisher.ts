import { EventPublisher } from '../../application/ports/EventPublisher.port';
import { DomainEvent } from '@distill/types';
import amqplib from 'amqplib';
import { Logger } from '../../application/use-cases/ValidateExtraction';

export class RabbitMQPublisher implements EventPublisher {
  private connection: amqplib.ChannelModel | null = null;
  private channel: amqplib.ConfirmChannel | null = null;

  constructor(
    private readonly rabbitUrl: string,
    private readonly logger: Logger
  ) {}

  async connect(): Promise<void> {
    if (this.connection) return;

    try {
      this.connection = await amqplib.connect(this.rabbitUrl);
      this.channel = await this.connection.createConfirmChannel();

      // Assert validation exchange
      await this.channel.assertExchange('validation.exchange', 'topic', { durable: true });

      this.logger.info('RabbitMQ Publisher connected');
    } catch (err: unknown) {
      const error = err as Error;
      this.logger.error({ error: error.message }, 'Failed to connect to RabbitMQ');
      throw error;
    }
  }

  async publish(exchange: string, routingKey: string, event: DomainEvent): Promise<boolean> {
    if (!this.channel) {
      throw new Error('RabbitMQ channel not initialized. Call connect() first.');
    }

    const payload = Buffer.from(JSON.stringify(event));

    try {
      this.channel.publish(exchange, routingKey, payload, {
        persistent: true,
        contentType: 'application/json',
        messageId: event.eventId,
        timestamp: new Date(event.timestamp).getTime(),
        appId: 'validation-service',
        headers: {
          'x-tenant-id': event.tenantId,
        },
      });
      await this.channel.waitForConfirms();
      return true;
    } catch (err: unknown) {
      const error = err as Error;
      this.logger.error(
        { error: error.message, eventId: event.eventId },
        'Failed to publish message'
      );
      throw error;
    }
  }

  async close(): Promise<void> {
    if (this.channel) await this.channel.close();
    if (this.connection) await this.connection.close();
    this.logger.info('RabbitMQ Publisher disconnected');
  }
}
