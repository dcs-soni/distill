import { DomainEvent } from '@distill/types';

export type UserRegisteredEvent = DomainEvent<{
  userId: string;
  email: string;
  name: string;
}>;

export type TenantCreatedEvent = DomainEvent<{
  tenantId: string;
  creatorUserId: string;
  plan: string;
}>;
