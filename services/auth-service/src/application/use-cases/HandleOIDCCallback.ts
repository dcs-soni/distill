import { randomBytes } from 'node:crypto';
import { UnauthorizedError, NotFoundError } from '@distill/utils';
import type { AuthRepositoryPort } from '../ports/AuthRepository.port.js';
import type { OIDCProviderPort } from '../ports/OIDCProvider.port.js';
import type { OIDCStateStorePort } from '../ports/OIDCStateStore.port.js';
import type { SessionServicePort } from '../ports/SessionService.port.js';

export class HandleOIDCCallback {
  constructor(
    private readonly oidcProvider: OIDCProviderPort,
    private readonly oidcStore: OIDCStateStorePort,
    private readonly sessionService: SessionServicePort,
    private readonly authRepository: AuthRepositoryPort
  ) {}

  async execute(code: string, state: string) {
    const authContext = await this.oidcStore.getAuthContext(state);
    if (!authContext) {
      throw new UnauthorizedError('Invalid or expired state parameter');
    }

    const { idToken } = await this.oidcProvider.exchangeCodeForTokens(
      code,
      authContext.codeVerifier,
      authContext.redirectUri
    );

    const userInfo = await this.oidcProvider.verifyIdToken(idToken, authContext.nonce);

    if (!userInfo.email) {
      throw new UnauthorizedError('OIDC provider did not return an email');
    }

    const user = await this.authRepository.upsertOIDCUser({
      oidcSubject: userInfo.sub,
      oidcIssuer: 'default',
      email: userInfo.email,
      name: userInfo.name ?? '',
      lastLoginAt: new Date(),
    });

    let tenantId = '';
    let role = 'ADMIN';

    const membership = await this.authRepository.findFirstMembershipWithTenant(user.id);

    if (!membership) {
      const normalizedName = (userInfo.name ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const slugBase = normalizedName.length > 0 ? normalizedName : 'tenant';
      const slug = `${slugBase}-${randomBytes(4).toString('hex')}`;

      const newTenant = await this.authRepository.createTenantWithAdminMember({
        userId: user.id,
        name: `${userInfo.name ?? 'User'}'s Organization`,
        slug,
        role: 'ADMIN',
      });
      tenantId = newTenant.id;
    } else {
      tenantId = membership.tenantId;
      role = membership.role;
    }

    const tenant = await this.authRepository.findTenantById(tenantId);
    if (!tenant) throw new NotFoundError('Tenant not found');

    const sessionTokens = await this.sessionService.createSession(user.id, tenantId, role);

    return {
      accessToken: sessionTokens.accessToken,
      refreshToken: sessionTokens.refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
      },
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        role,
      },
    };
  }
}
