import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AssignRole } from '../../../../src/application/use-cases/AssignRole.js';
import type { AuthRepositoryPort } from '../../../../src/application/ports/AuthRepository.port.js';
import { NotFoundError } from '@distill/utils';

import { generateId } from '../../../utils/factories.js';

describe('AssignRole', () => {
  let useCase: AssignRole;
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
    useCase = new AssignRole(mockAuthRepo);
  });

  it('should throw ForbiddenError if actor is not an ADMIN', async () => {
    mockAuthRepo.findTenantMembershipByUser.mockResolvedValue(null);
    await expect(useCase.execute('u1', 't1', 'm1', 'ADMIN')).rejects.toThrow('Requires ADMIN role');
  });

  it('should throw NotFoundError if membership does not exist', async () => {
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
    mockAuthRepo.findTenantMember.mockResolvedValue(null);
    await expect(useCase.execute('u1', 't1', 'm1', 'ADMIN')).rejects.toThrow(NotFoundError);
    expect(mockAuthRepo.findTenantMember).toHaveBeenCalledWith('t1', 'm1');
  });

  it('should successfully update the role', async () => {
    const memberId = generateId();
    mockAuthRepo.findTenantMember.mockResolvedValue({
      id: memberId,
      tenantId: 't1',
      userId: 'u1',
      role: 'VIEWER',
      joinedAt: new Date(),
    });

    mockAuthRepo.updateTenantMemberRole.mockResolvedValue({
      id: memberId,
      tenantId: 't1',
      userId: 'u1',
      role: 'ADMIN',
      joinedAt: new Date(),
    });

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

    const result = await useCase.execute('u1', 't1', memberId, 'ADMIN');

    expect(result.role).toBe('ADMIN');
    expect(mockAuthRepo.updateTenantMemberRole).toHaveBeenCalledWith('t1', memberId, 'ADMIN');
  });
});
