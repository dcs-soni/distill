import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ListTenantMembers } from '../../../../src/application/use-cases/ListTenantMembers.js';
import type { AuthRepositoryPort } from '../../../../src/application/ports/AuthRepository.port.js';

describe('ListTenantMembers', () => {
  let useCase: ListTenantMembers;
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
      updateTenant: vi.fn(),
    };
    useCase = new ListTenantMembers(mockAuthRepo);
  });

  it('should list tenant members', async () => {
    const mockMembers = [
      {
        id: '1',
        tenantId: 't1',
        userId: 'u1',
        role: 'ADMIN',
        joinedAt: new Date(),
        user: { name: 'A', email: 'a@a.com' },
      },
    ];
    mockAuthRepo.findTenantMembershipByUser.mockResolvedValue({
      id: 'm_actor',
      tenantId: 't1',
      userId: 'u1',
      role: 'VIEWER',
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
    mockAuthRepo.listTenantMembers.mockResolvedValue(mockMembers);

    const result = await useCase.execute('u1', 't1');
    expect(result).toEqual(mockMembers);
    expect(mockAuthRepo.listTenantMembers).toHaveBeenCalledWith('t1');
  });

  it('should throw ForbiddenError if actor is not a member', async () => {
    mockAuthRepo.findTenantMembershipByUser.mockResolvedValue(null);
    await expect(useCase.execute('u1', 't1')).rejects.toThrow('Requires membership');
  });
});
