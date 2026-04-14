import prismaClient from '../../infrastructure/persistence/prismaClient.js';
import { ForbiddenError } from '@distill/utils';
import { JwtSessionService } from '../../infrastructure/services/JwtSessionService.js';

export class SwitchTenant {
  constructor(private sessionService: JwtSessionService) {}

  async execute(userId: string, currentSessionId: string, targetTenantId: string) {
    const membership = await prismaClient.tenantMember.findUnique({
      where: {
        tenantId_userId: { tenantId: targetTenantId, userId },
      },
      include: { tenant: true },
    });

    if (!membership || !membership.tenant.isActive) {
      throw new ForbiddenError('Not a member of this tenant or tenant is inactive');
    }

    const { accessToken, refreshToken } = await this.sessionService.createSession(
      userId,
      targetTenantId,
      membership.role
    );

    // Optional: Revoke the old session so they don't have multiple parallel sessions locally
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
