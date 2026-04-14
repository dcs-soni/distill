import { OIDCProviderPort } from '../ports/OIDCProvider.port.js';
import { RedisOIDCStore } from '../../infrastructure/oidc/RedisOIDCStore.js';
import { JwtSessionService } from '../../infrastructure/services/JwtSessionService.js';
import prismaClient from '../../infrastructure/persistence/prismaClient.js';
import { UnauthorizedError, NotFoundError } from '@distill/utils';

export class HandleOIDCCallback {
  constructor(
    private oidcProvider: OIDCProviderPort,
    private oidcStore: RedisOIDCStore,
    private sessionService: JwtSessionService
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

    // Upsert User
    const user = await prismaClient.user.upsert({
      where: { oidcSubject: userInfo.sub },
      update: {
        lastLoginAt: new Date(),
        email: userInfo.email,
        name: userInfo.name || '',
      },
      create: {
        oidcSubject: userInfo.sub,
        oidcIssuer: 'default', // Ideally from provider info
        email: userInfo.email,
        name: userInfo.name || '',
        lastLoginAt: new Date(),
      },
    });

    // Check memberships
    let tenantIdStr = '';
    let role = 'ADMIN';

    const membership = await prismaClient.tenantMember.findFirst({
      where: { userId: user.id },
      include: { tenant: true },
    });

    if (!membership) {
      // First login - create default tenant
      const slugBase = userInfo.name
        ? userInfo.name.toLowerCase().replace(/[^a-z0-9]/g, '')
        : 'tenant';
      const slug = `${slugBase}-${Math.random().toString(36).substring(2, 6)}`;

      const newTenant = await prismaClient.tenant.create({
        data: {
          name: `${userInfo.name || 'User'}'s Organization`,
          slug,
          memberships: {
            create: {
              userId: user.id,
              role: 'ADMIN',
            },
          },
        },
      });
      tenantIdStr = newTenant.id;
    } else {
      tenantIdStr = membership.tenantId;
      role = membership.role;
    }

    const tenant = await prismaClient.tenant.findUnique({ where: { id: tenantIdStr } });
    if (!tenant) throw new NotFoundError('Tenant not found');

    const sessionTokens = await this.sessionService.createSession(user.id, tenantIdStr, role);

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
