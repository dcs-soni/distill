import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CreateTenant } from '../../../../src/application/use-cases/CreateTenant.js';
import type { AuthRepositoryPort } from '../../../../src/application/ports/AuthRepository.port.js';
import { ConflictError } from '@distill/utils';

import { generateId } from '../../../utils/factories.js';

describe('CreateTenant', () => {
  let useCase: CreateTenant;
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
    useCase = new CreateTenant(mockAuthRepo);
  });

  it('should throw ConflictError if slug already exists', async () => {
    mockAuthRepo.findTenantBySlug.mockResolvedValue({
      id: generateId(),
      name: 'Existing',
      slug: 'test-slug',
      plan: 'FREE',
      isActive: true,
      createdAt: new Date(),
    });

    await expect(useCase.execute('u1', 'New Name', 'test-slug')).rejects.toThrow(ConflictError);
    expect(mockAuthRepo.findTenantBySlug).toHaveBeenCalledWith('test-slug');
  });

  it('should successfully create tenant with admin member', async () => {
    mockAuthRepo.findTenantBySlug.mockResolvedValue(null);

    const newTenant = {
      id: generateId(),
      name: 'New Name',
      slug: 'new-slug',
      plan: 'FREE',
      isActive: true,
      createdAt: new Date(),
    };
    mockAuthRepo.createTenantWithAdminMember.mockResolvedValue(newTenant);

    const result = await useCase.execute('u1', 'New Name', 'new-slug');

    expect(result).toEqual(newTenant);
    expect(mockAuthRepo.createTenantWithAdminMember).toHaveBeenCalledWith({
      userId: 'u1',
      name: 'New Name',
      slug: 'new-slug',
      role: 'ADMIN',
    });
  });
});
