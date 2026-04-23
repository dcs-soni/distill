import { RabbitMQClient, ContextLogger, createLogger } from '@distill/utils';
import type { DomainEvent } from '@distill/types';
import type { EventPublisher } from '../../application/ports/EventPublisher.port.js';

export class RabbitMQPublisher implements EventPublisher {
  private readonly client: RabbitMQClient;

  constructor(url: string) {
    const pinoLogger = createLogger({ service: 'document-service' });
    const contextLogger = new ContextLogger(pinoLogger, { component: 'rabbitmq' });
    this.client = new RabbitMQClient(url, contextLogger);
  }

  async connect(): Promise<void> {
    await this.client.connect();
    await this.client.assertTopology({
      exchange: 'document.exchange',
      queue: 'extraction.document.uploaded',
      routingKey: 'document.uploaded.*',
      dlx: 'dlx.exchange',
    });
  }

  async publish(exchange: string, routingKey: string, event: DomainEvent): Promise<boolean> {
    return this.client.publish(exchange, routingKey, event);
  }

  async close(): Promise<void> {
    await this.client.close();
  }
}
