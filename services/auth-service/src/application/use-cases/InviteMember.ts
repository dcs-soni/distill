import { NotFoundError, ConflictError, ForbiddenError } from '@distill/utils';
import type { AuthRepositoryPort } from '../ports/AuthRepository.port.js';

export class InviteMember {
  constructor(private readonly authRepository: AuthRepositoryPort) {}

  async execute(actorUserId: string, tenantId: string, email: string, role: string) {
    const actorMembership = await this.authRepository.findTenantMembershipByUser(
      tenantId,
      actorUserId
    );
    if (!actorMembership || actorMembership.role !== 'ADMIN') {
      throw new ForbiddenError('Requires ADMIN role in the target tenant');
    }

    const user = await this.authRepository.findUserByEmail(email);
    if (!user) {
      throw new NotFoundError(`User with email ${email} not found`);
    }

    const existing = await this.authRepository.findTenantMembershipByUser(tenantId, user.id);
    if (existing) {
      throw new ConflictError('User is already a member of this tenant');
    }

    return this.authRepository.createTenantMember({
      tenantId,
      userId: user.id,
      role,
    });
  }
}
