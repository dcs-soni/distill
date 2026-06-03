import type { DomainEvent } from '@distill/types';

export interface EventPublisher {
  publish(exchange: string, routingKey: string, event: DomainEvent): Promise<void>;
  connect(): Promise<void>;
  close(): Promise<void>;
}
