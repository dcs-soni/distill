import { NotFoundError } from '@distill/utils';
import type { AuthRepositoryPort, TenantRecord } from '../ports/AuthRepository.port.js';

export class GetTenant {
  constructor(private readonly authRepo: AuthRepositoryPort) {}

  async execute(actorUserId: string, tenantId: string): Promise<TenantRecord> {
    const membership = await this.authRepo.findTenantMembershipByUser(tenantId, actorUserId);
    if (!membership) {
      throw new NotFoundError('Tenant not found');
    }

    const tenant = await this.authRepo.findTenantById(tenantId);
    if (!tenant) {
      throw new NotFoundError('Tenant not found');
    }

    return tenant;
  }
}
