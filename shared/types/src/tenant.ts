import { TenantId, UserId } from './common.js';

export type UserRole = 'ADMIN' | 'REVIEWER' | 'VIEWER' | 'API_USER';

export interface Tenant {
  id: TenantId;
  name: string;
  slug: string;
  plan: 'FREE' | 'PRO' | 'ENTERPRISE';
  isActive: boolean;
  createdAt: string;
}

export interface TenantMember {
  id: string;
  tenantId: TenantId;
  userId: UserId;
  role: UserRole;
  joinedAt: string;
}
