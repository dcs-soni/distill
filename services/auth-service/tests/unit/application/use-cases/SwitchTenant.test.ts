import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SwitchTenant } from '../../../../src/application/use-cases/SwitchTenant.js';
import type { AuthRepositoryPort } from '../../../../src/application/ports/AuthRepository.port.js';
import type { SessionServicePort } from '../../../../src/application/ports/SessionService.port.js';
import { ForbiddenError } from '@distill/utils';

describe('SwitchTenant', () => {
  let useCase: SwitchTenant;
  let mockAuthRepo: import('vitest').Mocked<AuthRepositoryPort>;
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
    mockSessionService = {
      createSession: vi.fn(),
      verifySession: vi.fn(),
      revokeSession: vi.fn(),
      refreshSession: vi.fn(),
    };
    useCase = new SwitchTenant(mockAuthRepo, mockSessionService);
  });

  it('should throw ForbiddenError if not a member or tenant is inactive', async () => {
    mockAuthRepo.findTenantMembershipByUser.mockResolvedValue(null);
    await expect(useCase.execute('u1', 'session123', 't1')).rejects.toThrow(ForbiddenError);

    mockAuthRepo.findTenantMembershipByUser.mockResolvedValue({
      id: 'm1',
      tenantId: 't1',
      userId: 'u1',
      role: 'VIEWER',
      joinedAt: new Date(),
      tenant: {
        id: 't1',
        name: 'Test',
        slug: 'test',
        plan: 'FREE',
        isActive: false, // inactive
        createdAt: new Date(),
      },
    });
    await expect(useCase.execute('u1', 'session123', 't1')).rejects.toThrow(ForbiddenError);
  });

  it('should successfully switch tenant and revoke old session', async () => {
    mockAuthRepo.findTenantMembershipByUser.mockResolvedValue({
      id: 'm1',
      tenantId: 't1',
      userId: 'u1',
      role: 'ADMIN',
      joinedAt: new Date(),
      tenant: {
        id: 't1',
        name: 'Test',
        slug: 'test',
        plan: 'FREE',
        isActive: true,
        createdAt: new Date(),
      },
    });

    mockSessionService.createSession.mockResolvedValue({
      accessToken: 'acc',
      refreshToken: 'ref',
      sessionId: 'sess123',
    });
    mockSessionService.revokeSession.mockResolvedValue();

    const result = await useCase.execute('u1', 'session123', 't1');

    expect(result.accessToken).toBe('acc');
    expect(result.tenant.role).toBe('ADMIN');
    expect(mockSessionService.createSession).toHaveBeenCalledWith('u1', 't1', 'ADMIN');
    expect(mockSessionService.revokeSession).toHaveBeenCalledWith('session123');
  });
});
