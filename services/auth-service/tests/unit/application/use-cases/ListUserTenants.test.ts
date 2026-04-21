import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ListUserTenants } from '../../../../src/application/use-cases/ListUserTenants.js';
import type { AuthRepositoryPort } from '../../../../src/application/ports/AuthRepository.port.js';

describe('ListUserTenants', () => {
  let useCase: ListUserTenants;
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
    useCase = new ListUserTenants(mockAuthRepo);
  });

  it('should list user tenants', async () => {
    const mockTenants = [
      { id: 't1', name: 'Test', slug: 'test', plan: 'FREE', isActive: true, createdAt: new Date() },
    ];
    mockAuthRepo.listUserTenants.mockResolvedValue(mockTenants);

    const result = await useCase.execute('u1');
    expect(result).toEqual(mockTenants);
    expect(mockAuthRepo.listUserTenants).toHaveBeenCalledWith('u1');
  });
});
