import { EventPublisher } from '../../application/ports/EventPublisher.port';
import { DomainEvent } from '@distill/types';
import amqplib from 'amqplib';

export class RabbitMQPublisher implements EventPublisher {
  private connection: amqplib.Connection | null = null;
  private channel: amqplib.Channel | null = null;

  constructor(
    private readonly rabbitUrl: string,
    private readonly logger: any
  ) {}

  async connect(): Promise<void> {
    if (this.connection) return;

    try {
      this.connection = await amqplib.connect(this.rabbitUrl);
      this.channel = await this.connection.createConfirmChannel();

      // Assert validation exchange
      await this.channel.assertExchange('validation.exchange', 'topic', { durable: true });
      
      this.logger.info('RabbitMQ Publisher connected');
    } catch (error) {
      this.logger.error({ error }, 'Failed to connect to RabbitMQ');
      throw error;
    }
  }

  async publish(exchange: string, routingKey: string, event: DomainEvent): Promise<boolean> {
    if (!this.channel) {
      throw new Error('RabbitMQ channel not initialized. Call connect() first.');
    }

    const payload = Buffer.from(JSON.stringify(event));

    return new Promise((resolve, reject) => {
      this.channel!.publish(
        exchange,
        routingKey,
        payload,
        {
          persistent: true,
          contentType: 'application/json',
          messageId: event.eventId,
          timestamp: new Date(event.timestamp).getTime(),
          appId: 'validation-service',
          headers: {
            'x-tenant-id': event.tenantId
          }
        },
        (err) => {
          if (err) {
            this.logger.error({ error: err, eventId: event.eventId }, 'Failed to publish message');
            reject(err);
          } else {
            resolve(true);
          }
        }
      );
    });
  }

  async close(): Promise<void> {
    if (this.channel) await this.channel.close();
    if (this.connection) await this.connection.close();
    this.logger.info('RabbitMQ Publisher disconnected');
  }
}
