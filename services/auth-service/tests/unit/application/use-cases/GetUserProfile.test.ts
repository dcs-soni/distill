import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GetUserProfile } from '../../../../src/application/use-cases/GetUserProfile.js';
import type { AuthRepositoryPort } from '../../../../src/application/ports/AuthRepository.port.js';
import { NotFoundError } from '@distill/utils';

describe('GetUserProfile', () => {
  let useCase: GetUserProfile;
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
    useCase = new GetUserProfile(mockAuthRepo);
  });

  it('should throw NotFoundError if user does not exist', async () => {
    mockAuthRepo.getUserProfile.mockResolvedValue(null);
    await expect(useCase.execute('u1')).rejects.toThrow(NotFoundError);
    expect(mockAuthRepo.getUserProfile).toHaveBeenCalledWith('u1');
  });

  it('should successfully return the user profile', async () => {
    const mockProfile = {
      id: 'u1',
      email: 'test@example.com',
      name: 'Test',
      avatarUrl: null,
      tenants: [],
    };
    mockAuthRepo.getUserProfile.mockResolvedValue(mockProfile);

    const result = await useCase.execute('u1');

    expect(result).toEqual(mockProfile);
    expect(mockAuthRepo.getUserProfile).toHaveBeenCalledWith('u1');
  });
});
