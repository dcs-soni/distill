import { NotFoundError, ForbiddenError } from '@distill/utils';
import type { AuthRepositoryPort } from '../ports/AuthRepository.port.js';

export class RemoveTenantMember {
  constructor(private readonly authRepository: AuthRepositoryPort) {}

  async execute(actorUserId: string, tenantId: string, memberId: string): Promise<void> {
    const actorMembership = await this.authRepository.findTenantMembershipByUser(
      tenantId,
      actorUserId
    );
    if (!actorMembership || actorMembership.role !== 'ADMIN') {
      throw new ForbiddenError('Requires ADMIN role in the target tenant');
    }

    const deleted = await this.authRepository.deleteTenantMember(tenantId, memberId);
    if (!deleted) {
      throw new NotFoundError('Tenant member not found');
    }
  }
}
