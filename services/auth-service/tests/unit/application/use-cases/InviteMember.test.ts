import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InviteMember } from '../../../../src/application/use-cases/InviteMember.js';
import type { AuthRepositoryPort } from '../../../../src/application/ports/AuthRepository.port.js';
import { NotFoundError, ConflictError } from '@distill/utils';

describe('InviteMember', () => {
  let useCase: InviteMember;
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
    useCase = new InviteMember(mockAuthRepo);
  });

  it('should throw ForbiddenError if actor is not an ADMIN', async () => {
    mockAuthRepo.findTenantMembershipByUser.mockResolvedValue(null);
    await expect(useCase.execute('u1', 't1', 'test@example.com', 'VIEWER')).rejects.toThrow(
      'Requires ADMIN role'
    );
  });

  it('should throw NotFoundError if user not found by email', async () => {
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
    mockAuthRepo.findUserByEmail.mockResolvedValue(null);
    await expect(useCase.execute('u1', 't1', 'test@example.com', 'VIEWER')).rejects.toThrow(
      NotFoundError
    );
  });

  it('should throw ConflictError if user is already a member', async () => {
    mockAuthRepo.findTenantById.mockResolvedValue({
      id: 't1',
      name: 'Tenant 1',
      slug: 't1',
      plan: 'FREE',
      isActive: true,
      createdAt: new Date(),
    });

    mockAuthRepo.findUserByEmail.mockResolvedValue({
      id: 'u2',
      email: 'test@example.com',
      name: 'Test',
      avatarUrl: null,
    });

    mockAuthRepo.findTenantMembershipByUser.mockImplementation(async (tId, uId) => {
      if (uId === 'u1')
        return {
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
        };
      if (uId === 'u2')
        return {
          id: 'm1',
          tenantId: 't1',
          userId: 'u2',
          role: 'VIEWER',
          joinedAt: new Date(),
          tenant: {
            id: 't1',
            name: 'Tenant 1',
            slug: 't1',
            plan: 'FREE',
            isActive: true,
            createdAt: new Date(),
          },
        };
      return null;
    });

    await expect(useCase.execute('u1', 't1', 'test@example.com', 'VIEWER')).rejects.toThrow(
      ConflictError
    );
  });

  it('should invite member successfully', async () => {
    mockAuthRepo.findTenantById.mockResolvedValue({
      id: 't1',
      name: 'Tenant 1',
      slug: 't1',
      plan: 'FREE',
      isActive: true,
      createdAt: new Date(),
    });

    mockAuthRepo.findUserByEmail.mockResolvedValue({
      id: 'u2',
      email: 'test@example.com',
      name: 'Test',
      avatarUrl: null,
    });

    mockAuthRepo.findTenantMembershipByUser.mockImplementation(async (tId, uId) => {
      if (uId === 'u1')
        return {
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
        };
      return null;
    });

    mockAuthRepo.createTenantMember.mockResolvedValue({
      id: 'm1',
      tenantId: 't1',
      userId: 'u2',
      role: 'VIEWER',
      joinedAt: new Date(),
    });

    const result = await useCase.execute('u1', 't1', 'test@example.com', 'VIEWER');

    expect(result.id).toBe('m1');
    expect(mockAuthRepo.createTenantMember).toHaveBeenCalledWith({
      tenantId: 't1',
      userId: 'u2',
      role: 'VIEWER',
    });
  });
});
