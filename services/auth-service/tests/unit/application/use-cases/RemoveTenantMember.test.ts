import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RemoveTenantMember } from '../../../../src/application/use-cases/RemoveTenantMember.js';
import type { AuthRepositoryPort } from '../../../../src/application/ports/AuthRepository.port.js';

describe('RemoveTenantMember', () => {
  let useCase: RemoveTenantMember;
  let mockAuthRepo: import('vitest').Mocked<AuthRepositoryPort>;

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
    };
    useCase = new RemoveTenantMember(mockAuthRepo);
  });

  it('should remove tenant member', async () => {
    mockAuthRepo.findTenantMembershipByUser.mockResolvedValue({
      id: 'm_actor',
      tenantId: 't1',
      userId: 'u1',
      role: 'ADMIN',
      joinedAt: new Date(),
      tenant: {
        id: 't1',
        name: 'T1',
        slug: 't1',
        plan: 'FREE',
        isActive: true,
        createdAt: new Date(),
      },
    });
    mockAuthRepo.deleteTenantMember.mockResolvedValue(true);

    const result = await useCase.execute('u1', 't1', 'm1');
    expect(result).toBeUndefined();
    expect(mockAuthRepo.deleteTenantMember).toHaveBeenCalledWith('t1', 'm1');
  });

  it('should throw ForbiddenError if actor is not an ADMIN', async () => {
    mockAuthRepo.findTenantMembershipByUser.mockResolvedValue(null);
    await expect(useCase.execute('u1', 't1', 'm1')).rejects.toThrow('Requires ADMIN role');
  });
});
