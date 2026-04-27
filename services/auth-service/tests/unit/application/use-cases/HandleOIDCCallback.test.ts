import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HandleOIDCCallback } from '../../../../src/application/use-cases/HandleOIDCCallback.js';
import type { AuthRepositoryPort } from '../../../../src/application/ports/AuthRepository.port.js';
import type { OIDCProviderPort } from '../../../../src/application/ports/OIDCProvider.port.js';
import type { OIDCStateStorePort } from '../../../../src/application/ports/OIDCStateStore.port.js';
import type { SessionServicePort } from '../../../../src/application/ports/SessionService.port.js';
import { UnauthorizedError } from '@distill/utils';

import { generateId } from '../../../utils/factories.js';

describe('HandleOIDCCallback', () => {
  let useCase: HandleOIDCCallback;
  let mockAuthRepo: import('vitest').Mocked<AuthRepositoryPort>;
  let mockOidcProvider: import('vitest').Mocked<OIDCProviderPort>;
  let mockOidcStore: import('vitest').Mocked<OIDCStateStorePort>;
  let mockSessionService: import('vitest').Mocked<SessionServicePort>;

  beforeEach(() => {
    mockAuthRepo = {
      findTenantById: vi.fn(),
      findTenantBySlug: vi.fn(),
      createTenantWithAdminMember: vi.fn(),
      listUserTenants: vi.fn(),
      getUserProfile: vi.fn(),
      upsertOIDCUser: vi.fn(),
      findFirstMembershipWithTenant: vi.fn(),
      findUserByEmail: vi.fn(),
      findTenantMembershipByUser: vi.fn(),
      findTenantMember: vi.fn(),
      createTenantMember: vi.fn(),
      updateTenantMemberRole: vi.fn(),
      listTenantMembers: vi.fn(),
      deleteTenantMember: vi.fn(),
      updateTenant: vi.fn(),
    };
    mockOidcProvider = {
      discoverProvider: vi.fn(),
      getAuthorizationUrl: vi.fn(),
      exchangeCodeForTokens: vi.fn(),
      getUserInfo: vi.fn(),
      refreshAccessToken: vi.fn(),
    };
    mockOidcStore = {
      saveAuthContext: vi.fn(),
      getAuthContext: vi.fn(),
    };
    mockSessionService = {
      createSession: vi.fn(),
      verifySession: vi.fn(),
      revokeSession: vi.fn(),
      refreshSession: vi.fn(),
    };

    useCase = new HandleOIDCCallback(
      mockOidcProvider,
      mockOidcStore,
      mockSessionService,
      mockAuthRepo
    );
  });

  it('should throw UnauthorizedError if state is invalid', async () => {
    mockOidcStore.getAuthContext.mockResolvedValue(null);
    await expect(useCase.execute('code123', 'invalid-state')).rejects.toThrow(UnauthorizedError);
  });

  it('should handle first login and create default tenant', async () => {
    mockOidcStore.getAuthContext.mockResolvedValue({
      codeVerifier: 'verifier',
      redirectUri: 'http://localhost/callback',
      nonce: 'nonce123',
    });

    mockOidcProvider.exchangeCodeForTokens.mockResolvedValue({
      accessToken: 'access',
      idToken: 'id',
      refreshToken: 'refresh',
      userInfo: {
        sub: 'sub123',
        email: 'test@example.com',
        name: 'Test User',
        issuer: 'https://issuer.com',
      },
    });

    const mockUser = {
      id: generateId(),
      email: 'test@example.com',
      name: 'Test User',
      avatarUrl: null,
    };
    mockAuthRepo.upsertOIDCUser.mockResolvedValue(mockUser);
    mockAuthRepo.findFirstMembershipWithTenant.mockResolvedValue(null);

    const mockTenant = {
      id: generateId(),
      name: "Test User's Organization",
      slug: 'testuser-slug',
      plan: 'FREE',
      isActive: true,
      createdAt: new Date(),
    };
    mockAuthRepo.createTenantWithAdminMember.mockResolvedValue(mockTenant);
    mockAuthRepo.findTenantById.mockResolvedValue(mockTenant);

    mockSessionService.createSession.mockResolvedValue({
      accessToken: 'jwt-access',
      refreshToken: 'jwt-refresh',
      sessionId: 'sess123',
    });

    const result = await useCase.execute('code123', 'valid-state');

    expect(result.accessToken).toBe('jwt-access');
    expect(result.user.id).toBe(mockUser.id);
    expect(result.tenant.id).toBe(mockTenant.id);
    expect(mockAuthRepo.createTenantWithAdminMember).toHaveBeenCalled();
  });

  it('should handle existing user login', async () => {
    mockOidcStore.getAuthContext.mockResolvedValue({
      codeVerifier: 'verifier',
      redirectUri: 'http://localhost/callback',
      nonce: 'nonce123',
    });

    mockOidcProvider.exchangeCodeForTokens.mockResolvedValue({
      accessToken: 'access',
      idToken: 'id',
      refreshToken: 'refresh',
      userInfo: {
        sub: 'sub123',
        email: 'test@example.com',
        name: 'Test User',
        issuer: 'https://issuer.com',
      },
    });

    const mockUser = {
      id: generateId(),
      email: 'test@example.com',
      name: 'Test User',
      avatarUrl: null,
    };
    mockAuthRepo.upsertOIDCUser.mockResolvedValue(mockUser);

    const mockTenant = {
      id: generateId(),
      name: "Test User's Organization",
      slug: 'testuser-slug',
      plan: 'FREE',
      isActive: true,
      createdAt: new Date(),
    };

    mockAuthRepo.findFirstMembershipWithTenant.mockResolvedValue({
      id: generateId(),
      tenantId: mockTenant.id,
      userId: mockUser.id,
      role: 'ADMIN',
      joinedAt: new Date(),
      tenant: mockTenant,
    });

    mockAuthRepo.findTenantById.mockResolvedValue(mockTenant);

    mockSessionService.createSession.mockResolvedValue({
      accessToken: 'jwt-access',
      refreshToken: 'jwt-refresh',
      sessionId: 'sess456',
    });

    const result = await useCase.execute('code123', 'valid-state');

    expect(result.accessToken).toBe('jwt-access');
    expect(mockAuthRepo.createTenantWithAdminMember).not.toHaveBeenCalled();
  });
});
