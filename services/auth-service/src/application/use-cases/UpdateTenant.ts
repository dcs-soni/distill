import { ForbiddenError, NotFoundError, ConflictError } from '@distill/utils';
import type { AuthRepositoryPort, TenantRecord } from '../ports/AuthRepository.port.js';

export interface UpdateTenantDTO {
  name?: string;
  slug?: string;
}

export class UpdateTenant {
  constructor(private readonly authRepo: AuthRepositoryPort) {}

  async execute(
    actorUserId: string,
    tenantId: string,
    input: UpdateTenantDTO
  ): Promise<TenantRecord> {
    const membership = await this.authRepo.findTenantMembershipByUser(tenantId, actorUserId);
    if (!membership) {
      throw new NotFoundError('Tenant not found');
    }

    if (membership.role !== 'ADMIN') {
      throw new ForbiddenError('Only ADMIN users can update tenant settings');
    }

    if (input.slug) {
      const existing = await this.authRepo.findTenantBySlug(input.slug);
      if (existing && existing.id !== tenantId) {
        throw new ConflictError('Tenant slug is already taken');
      }
    }

    return this.authRepo.updateTenant(tenantId, input);
  }
}
