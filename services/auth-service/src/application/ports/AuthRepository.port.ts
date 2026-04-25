export interface AuthUserRecord {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
}

export interface TenantRecord {
  id: string;
  name: string;
  slug: string;
  plan: string;
  isActive: boolean;
  createdAt: Date;
}

export interface TenantMemberRecord {
  id: string;
  tenantId: string;
  userId: string;
  role: string;
  joinedAt: Date;
}

export interface TenantMemberWithTenantRecord extends TenantMemberRecord {
  tenant: TenantRecord;
}

export interface TenantMemberWithUserRecord extends TenantMemberRecord {
  user: {
    name: string;
    email: string;
  };
}

export interface UserProfileRecord extends AuthUserRecord {
  tenants: Array<{
    id: string;
    name: string;
    slug: string;
    role: string;
    isActive: boolean;
  }>;
}

export interface UpsertOIDCUserInput {
  oidcSubject: string;
  oidcIssuer: string;
  email: string;
  name: string;
  lastLoginAt: Date;
}

export interface CreateTenantWithAdminInput {
  userId: string;
  name: string;
  slug: string;
  role: string;
}

export interface CreateTenantMemberInput {
  tenantId: string;
  userId: string;
  role: string;
}

export interface AuthRepositoryPort {
  findTenantById(tenantId: string): Promise<TenantRecord | null>;
  findTenantBySlug(slug: string): Promise<TenantRecord | null>;
  createTenantWithAdminMember(input: CreateTenantWithAdminInput): Promise<TenantRecord>;
  listUserTenants(userId: string): Promise<TenantRecord[]>;
  getUserProfile(userId: string): Promise<UserProfileRecord | null>;
  upsertOIDCUser(input: UpsertOIDCUserInput): Promise<AuthUserRecord>;
  findFirstMembershipWithTenant(userId: string): Promise<TenantMemberWithTenantRecord | null>;
  findUserByEmail(email: string): Promise<AuthUserRecord | null>;
  findTenantMembershipByUser(
    tenantId: string,
    userId: string
  ): Promise<TenantMemberWithTenantRecord | null>;
  findTenantMember(tenantId: string, memberId: string): Promise<TenantMemberRecord | null>;
  createTenantMember(input: CreateTenantMemberInput): Promise<TenantMemberRecord>;
  updateTenantMemberRole(
    tenantId: string,
    memberId: string,
    role: string
  ): Promise<TenantMemberRecord>;
  listTenantMembers(tenantId: string): Promise<TenantMemberWithUserRecord[]>;
  deleteTenantMember(tenantId: string, memberId: string): Promise<boolean>;
}
