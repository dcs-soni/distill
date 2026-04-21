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
    };
    useCase = new InviteMember(mockAuthRepo);
  });

  it('should throw NotFoundError if user not found by email', async () => {
    mockAuthRepo.findUserByEmail.mockResolvedValue(null);
    await expect(useCase.execute('t1', 'test@example.com', 'VIEWER')).rejects.toThrow(
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

    mockAuthRepo.findTenantMembershipByUser.mockResolvedValue({
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
    });

    await expect(useCase.execute('t1', 'test@example.com', 'VIEWER')).rejects.toThrow(
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

    mockAuthRepo.findTenantMembershipByUser.mockResolvedValue(null);

    mockAuthRepo.createTenantMember.mockResolvedValue({
      id: 'm1',
      tenantId: 't1',
      userId: 'u2',
      role: 'VIEWER',
      joinedAt: new Date(),
    });

    const result = await useCase.execute('t1', 'test@example.com', 'VIEWER');

    expect(result.id).toBe('m1');
    expect(mockAuthRepo.createTenantMember).toHaveBeenCalledWith({
      tenantId: 't1',
      userId: 'u2',
      role: 'VIEWER',
    });
  });
});
