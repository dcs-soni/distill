import { ForbiddenError } from '@distill/utils';
import type { AuthRepositoryPort } from '../ports/AuthRepository.port.js';

export class ListTenantMembers {
  constructor(private readonly authRepository: AuthRepositoryPort) {}

  async execute(actorUserId: string, tenantId: string) {
    const actorMembership = await this.authRepository.findTenantMembershipByUser(
      tenantId,
      actorUserId
    );
    if (!actorMembership) {
      throw new ForbiddenError('Requires membership in the target tenant');
    }

    return this.authRepository.listTenantMembers(tenantId);
  }
}
