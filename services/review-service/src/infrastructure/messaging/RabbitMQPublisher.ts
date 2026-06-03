import { RabbitMQClient, ContextLogger, createLogger } from '@distill/utils';
import type { DomainEvent } from '@distill/types';
import type { EventPublisher } from '../../application/ports/EventPublisher.port.js';

export class RabbitMQPublisher implements EventPublisher {
  private client: RabbitMQClient;

  constructor(private readonly url: string) {
    const pinoLogger = createLogger({ service: 'review-service' });
    const contextLogger = new ContextLogger(pinoLogger, { component: 'rabbitmq' });
    this.client = new RabbitMQClient(this.url, contextLogger);
  }

  async connect(): Promise<void> {
    await this.client.connect();

    await this.client.assertTopology({
      exchange: 'review.exchange',
      queue: 'analytics.review.completed', // just an example binding, we just assert exchange really
      routingKey: 'review.completed.*',
    });
  }

  async publish(exchange: string, routingKey: string, event: DomainEvent): Promise<void> {
    await this.client.publish(exchange, routingKey, event);
  }

  async close(): Promise<void> {
    await this.client.close();
  }
}
