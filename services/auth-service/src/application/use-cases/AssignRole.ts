import { NotFoundError, ForbiddenError } from '@distill/utils';
import type { AuthRepositoryPort } from '../ports/AuthRepository.port.js';

export class AssignRole {
  constructor(private readonly authRepository: AuthRepositoryPort) {}

  async execute(actorUserId: string, tenantId: string, memberId: string, newRole: string) {
    const actorMembership = await this.authRepository.findTenantMembershipByUser(
      tenantId,
      actorUserId
    );
    if (!actorMembership || actorMembership.role !== 'ADMIN') {
      throw new ForbiddenError('Requires ADMIN role in the target tenant');
    }

    const membership = await this.authRepository.findTenantMember(tenantId, memberId);
    if (!membership) {
      throw new NotFoundError('Tenant member not found');
    }

    return this.authRepository.updateTenantMemberRole(tenantId, memberId, newRole);
  }
}
