import { NotFoundError } from '@distill/utils';
import type { AuthRepositoryPort } from '../ports/AuthRepository.port.js';

export class AssignRole {
  constructor(private readonly authRepository: AuthRepositoryPort) {}

  async execute(tenantId: string, memberId: string, newRole: string) {
    const membership = await this.authRepository.findTenantMember(tenantId, memberId);
    if (!membership) {
      throw new NotFoundError('Tenant member not found');
    }

    return this.authRepository.updateTenantMemberRole(memberId, newRole);
  }
}
