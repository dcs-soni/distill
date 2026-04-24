import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { PrismaAuthRepository } from '../../src/infrastructure/persistence/PrismaAuthRepository.js';
import { JwtSessionService } from '../../src/infrastructure/services/JwtSessionService.js';
import { HandleOIDCCallback } from '../../src/application/use-cases/HandleOIDCCallback.js';
import prisma from '../../src/infrastructure/persistence/prismaClient.js';
import { clearDatabase, clearRedis, redis } from './setup.js';
import type { OIDCProviderPort } from '../../src/application/ports/OIDCProvider.port.js';
import type { OIDCStateStorePort } from '../../src/application/ports/OIDCStateStore.port.js';

describe('Auth Flow Integration', () => {
  let authRepository: PrismaAuthRepository;
  let sessionService: JwtSessionService;
  let handleOIDCCallback: HandleOIDCCallback;

  const mockOidcProvider = {
    discoverProvider: async () => {},
    getAuthorizationUrl: async () => 'url',
    exchangeCodeForTokens: async () => ({
      accessToken: 'acc',
      idToken: 'id',
      refreshToken: 'ref',
      userInfo: {
        sub: 'subject-123',
        email: 'flow@example.com',
        name: 'Flow User',
        issuer: 'https://test-issuer.com',
      },
    }),
    getUserInfo: async () => ({ sub: 'subject-123', name: 'Flow User', email: 'flow@example.com' }),
    refreshAccessToken: async () => ({ accessToken: 'acc', idToken: 'id', expiresIn: 3600 }),
  };

  const mockOidcStore = {
    saveAuthContext: async () => {},
    getAuthContext: async () => ({ codeVerifier: 'v', redirectUri: 'r', nonce: 'n' }),
  };

  beforeAll(async () => {
    authRepository = new PrismaAuthRepository();
    sessionService = new JwtSessionService();

    handleOIDCCallback = new HandleOIDCCallback(
      mockOidcProvider as unknown as OIDCProviderPort,
      mockOidcStore as unknown as OIDCStateStorePort,
      sessionService,
      authRepository
    );
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await redis.quit();
  });

  beforeEach(async () => {
    await clearDatabase();
    await clearRedis();
  });

  it('should complete full OIDC login flow for a new user', async () => {
    const result = await handleOIDCCallback.execute('code123', 'state123');

    expect(result.accessToken).toBeDefined();
    expect(result.refreshToken).toBeDefined();
    expect(result.user.email).toBe('flow@example.com');
    expect(result.tenant.name).toBe("Flow User's Organization");
    expect(result.tenant.role).toBe('ADMIN');

    // Verify DB state
    const userInDb = await prisma.user.findFirst({ where: { email: 'flow@example.com' } });
    expect(userInDb).not.toBeNull();

    const tenantInDb = await prisma.tenant.findUnique({ where: { id: result.tenant.id } });
    expect(tenantInDb).not.toBeNull();

    const membership = await prisma.tenantMember.findFirst({
      where: { userId: result.user.id, tenantId: result.tenant.id },
    });
    expect(membership?.role).toBe('ADMIN');
  });
});
