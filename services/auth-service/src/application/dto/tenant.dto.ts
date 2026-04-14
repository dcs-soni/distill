import { z } from 'zod';

export const CreateTenantSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(3),
});
export type CreateTenantDTO = z.infer<typeof CreateTenantSchema>;

export const InviteMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(['ADMIN', 'REVIEWER', 'VIEWER', 'API_USER']),
});
export type InviteMemberDTO = z.infer<typeof InviteMemberSchema>;

export const AssignRoleSchema = z.object({
  role: z.enum(['ADMIN', 'REVIEWER', 'VIEWER', 'API_USER']),
});
export type AssignRoleDTO = z.infer<typeof AssignRoleSchema>;

export const SwitchTenantSchema = z.object({
  tenantId: z.string().uuid(),
});
export type SwitchTenantDTO = z.infer<typeof SwitchTenantSchema>;

export const TenantResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  plan: z.string(),
  isActive: z.boolean(),
  createdAt: z.date(),
});
export type TenantResponseDTO = z.infer<typeof TenantResponseSchema>;

export const TenantMemberResponseSchema = z.object({
  id: z.string(),
  userId: z.string(),
  tenantId: z.string(),
  role: z.string(),
  joinedAt: z.date(),
  user: z
    .object({
      name: z.string(),
      email: z.string().email(),
    })
    .optional(),
});
export type TenantMemberResponseDTO = z.infer<typeof TenantMemberResponseSchema>;
