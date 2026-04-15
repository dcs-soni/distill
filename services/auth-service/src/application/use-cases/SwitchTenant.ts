import { ForbiddenError } from '@distill/utils';
import type { AuthRepositoryPort } from '../ports/AuthRepository.port.js';
import type { SessionServicePort } from '../ports/SessionService.port.js';

export class SwitchTenant {
  constructor(
    private readonly authRepository: AuthRepositoryPort,
    private readonly sessionService: SessionServicePort
  ) {}

  async execute(userId: string, currentSessionId: string, targetTenantId: string) {
    const membership = await this.authRepository.findTenantMembershipByUser(targetTenantId, userId);
    if (!membership || !membership.tenant.isActive) {
      throw new ForbiddenError('Not a member of this tenant or tenant is inactive');
    }

    const { accessToken, refreshToken } = await this.sessionService.createSession(
      userId,
      targetTenantId,
      membership.role
    );

    await this.sessionService.revokeSession(currentSessionId).catch(() => {});

    return {
      accessToken,
      refreshToken,
      tenant: {
        id: membership.tenant.id,
        name: membership.tenant.name,
        slug: membership.tenant.slug,
        role: membership.role,
      },
    };
  }
}
