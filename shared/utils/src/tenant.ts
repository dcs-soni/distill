import type { TenantId } from '@distill/types';
import { UnauthorizedError } from './errors.js';

export const extractTenantId = (
  headers: Record<string, string | string[] | undefined>
): TenantId => {
  const tenantId = headers['x-tenant-id'];

  if (!tenantId || typeof tenantId !== 'string') {
    throw new UnauthorizedError('Missing or invalid X-Tenant-ID header');
  }

  return tenantId as TenantId;
};

export const validateTenantId = (tenantId: string): boolean => {
  return typeof tenantId === 'string' && tenantId.length > 5;
};

export class TenantContext {
  constructor(public readonly tenantId: TenantId) {}

  public matches(otherId: string): boolean {
    return this.tenantId === otherId;
  }
}
