import type { DomainEvent } from '@distill/types';

export interface EventPublisher {
  publish(exchange: string, routingKey: string, event: DomainEvent): Promise<boolean>;
  connect(): Promise<void>;
  close(): Promise<void>;
}
