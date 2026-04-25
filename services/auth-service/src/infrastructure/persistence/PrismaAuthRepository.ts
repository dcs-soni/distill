import type {
  AuthRepositoryPort,
  AuthUserRecord,
  CreateTenantMemberInput,
  CreateTenantWithAdminInput,
  TenantMemberRecord,
  TenantMemberWithTenantRecord,
  TenantMemberWithUserRecord,
  TenantRecord,
  UpsertOIDCUserInput,
  UserProfileRecord,
} from '../../application/ports/AuthRepository.port.js';
import prismaClient from './prismaClient.js';

const toTenantRecord = (tenant: {
  id: string;
  name: string;
  slug: string;
  plan: string;
  isActive: boolean;
  createdAt: Date;
}): TenantRecord => ({
  id: tenant.id,
  name: tenant.name,
  slug: tenant.slug,
  plan: tenant.plan,
  isActive: tenant.isActive,
  createdAt: tenant.createdAt,
});

const toUserRecord = (user: {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
}): AuthUserRecord => ({
  id: user.id,
  email: user.email,
  name: user.name,
  avatarUrl: user.avatarUrl,
});

const toTenantMemberRecord = (member: {
  id: string;
  tenantId: string;
  userId: string;
  role: string;
  joinedAt: Date;
}): TenantMemberRecord => ({
  id: member.id,
  tenantId: member.tenantId,
  userId: member.userId,
  role: member.role,
  joinedAt: member.joinedAt,
});

export class PrismaAuthRepository implements AuthRepositoryPort {
  async findTenantById(tenantId: string): Promise<TenantRecord | null> {
    const tenant = await prismaClient.tenant.findUnique({ where: { id: tenantId } });
    return tenant ? toTenantRecord(tenant) : null;
  }

  async findTenantBySlug(slug: string): Promise<TenantRecord | null> {
    const tenant = await prismaClient.tenant.findUnique({ where: { slug } });
    return tenant ? toTenantRecord(tenant) : null;
  }

  async createTenantWithAdminMember(input: CreateTenantWithAdminInput): Promise<TenantRecord> {
    const tenant = await prismaClient.tenant.create({
      data: {
        name: input.name,
        slug: input.slug,
        memberships: {
          create: {
            userId: input.userId,
            role: input.role,
          },
        },
      },
    });

    return toTenantRecord(tenant);
  }

  async listUserTenants(userId: string): Promise<TenantRecord[]> {
    const user = await prismaClient.user.findUnique({
      where: { id: userId },
      include: { memberships: { include: { tenant: true } } },
    });

    return user?.memberships.map(({ tenant }) => toTenantRecord(tenant)) ?? [];
  }

  async getUserProfile(userId: string): Promise<UserProfileRecord | null> {
    const user = await prismaClient.user.findUnique({
      where: { id: userId },
      include: {
        memberships: {
          include: { tenant: true },
        },
      },
    });

    if (!user) return null;

    return {
      ...toUserRecord(user),
      tenants: user.memberships.map((membership) => ({
        id: membership.tenant.id,
        name: membership.tenant.name,
        slug: membership.tenant.slug,
        role: membership.role,
        isActive: membership.tenant.isActive,
      })),
    };
  }

  async upsertOIDCUser(input: UpsertOIDCUserInput): Promise<AuthUserRecord> {
    const user = await prismaClient.user.upsert({
      where: { oidcSubject: input.oidcSubject },
      update: {
        lastLoginAt: input.lastLoginAt,
        email: input.email,
        name: input.name,
      },
      create: {
        oidcSubject: input.oidcSubject,
        oidcIssuer: input.oidcIssuer,
        email: input.email,
        name: input.name,
        lastLoginAt: input.lastLoginAt,
      },
    });

    return toUserRecord(user);
  }

  async findFirstMembershipWithTenant(
    userId: string
  ): Promise<TenantMemberWithTenantRecord | null> {
    const membership = await prismaClient.tenantMember.findFirst({
      where: { userId },
      include: { tenant: true },
    });

    return membership
      ? {
          ...toTenantMemberRecord(membership),
          tenant: toTenantRecord(membership.tenant),
        }
      : null;
  }

  async findUserByEmail(email: string): Promise<AuthUserRecord | null> {
    const user = await prismaClient.user.findUnique({ where: { email } });
    return user ? toUserRecord(user) : null;
  }

  async findTenantMembershipByUser(
    tenantId: string,
    userId: string
  ): Promise<TenantMemberWithTenantRecord | null> {
    const membership = await prismaClient.tenantMember.findUnique({
      where: {
        tenantId_userId: { tenantId, userId },
      },
      include: { tenant: true },
    });

    return membership
      ? {
          ...toTenantMemberRecord(membership),
          tenant: toTenantRecord(membership.tenant),
        }
      : null;
  }

  async findTenantMember(tenantId: string, memberId: string): Promise<TenantMemberRecord | null> {
    const membership = await prismaClient.tenantMember.findFirst({
      where: { id: memberId, tenantId },
    });

    return membership ? toTenantMemberRecord(membership) : null;
  }

  async createTenantMember(input: CreateTenantMemberInput): Promise<TenantMemberRecord> {
    const membership = await prismaClient.tenantMember.create({
      data: {
        tenantId: input.tenantId,
        userId: input.userId,
        role: input.role,
      },
    });

    return toTenantMemberRecord(membership);
  }

  async updateTenantMemberRole(
    tenantId: string,
    memberId: string,
    role: string
  ): Promise<TenantMemberRecord> {
    const existing = await prismaClient.tenantMember.findFirst({
      where: { id: memberId, tenantId },
    });

    if (!existing) {
      throw new Error('Tenant member not found');
    }

    const membership = await prismaClient.tenantMember.update({
      where: { id: memberId },
      data: { role },
    });

    return toTenantMemberRecord(membership);
  }

  async listTenantMembers(tenantId: string): Promise<TenantMemberWithUserRecord[]> {
    const members = await prismaClient.tenantMember.findMany({
      where: { tenantId },
      include: {
        user: {
          select: { name: true, email: true },
        },
      },
      orderBy: { joinedAt: 'desc' },
    });

    return members.map((member) => ({
      ...toTenantMemberRecord(member),
      user: member.user,
    }));
  }

  async deleteTenantMember(tenantId: string, memberId: string): Promise<boolean> {
    const result = await prismaClient.tenantMember.deleteMany({
      where: { id: memberId, tenantId },
    });

    return result.count > 0;
  }
}
