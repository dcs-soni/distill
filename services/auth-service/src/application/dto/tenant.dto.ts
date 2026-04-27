import { z } from 'zod';

const TENANT_ROLES = ['ADMIN', 'REVIEWER', 'VIEWER', 'API_USER'] as const;

export const TenantIdParamsSchema = z.object({
  id: z.string().min(1),
});
export type TenantIdParamsDTO = z.infer<typeof TenantIdParamsSchema>;

export const TenantMemberParamsSchema = z.object({
  id: z.string().min(1),
  memberId: z.string().min(1),
});
export type TenantMemberParamsDTO = z.infer<typeof TenantMemberParamsSchema>;

export const CreateTenantSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z
    .string()
    .min(3)
    .max(50)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
});
export type CreateTenantDTO = z.infer<typeof CreateTenantSchema>;

export const UpdateTenantSchema = z
  .object({
    name: z.string().min(1).max(100).optional(),
    slug: z
      .string()
      .min(3)
      .max(50)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .optional(),
  })
  .refine((data) => data.name !== undefined || data.slug !== undefined, {
    message: 'At least one field (name or slug) must be provided',
  });
export type UpdateTenantDTO = z.infer<typeof UpdateTenantSchema>;

export const InviteMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(TENANT_ROLES),
});
export type InviteMemberDTO = z.infer<typeof InviteMemberSchema>;

export const AssignRoleSchema = z.object({
  role: z.enum(TENANT_ROLES),
});
export type AssignRoleDTO = z.infer<typeof AssignRoleSchema>;

export const SwitchTenantSchema = z.object({
  tenantId: z.string().min(1),
});
export type SwitchTenantDTO = z.infer<typeof SwitchTenantSchema>;

export const TenantResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  plan: z.string(),
  isActive: z.boolean(),
  createdAt: z.coerce.date(),
});
export type TenantResponseDTO = z.infer<typeof TenantResponseSchema>;

export const TenantMemberResponseSchema = z.object({
  id: z.string(),
  userId: z.string(),
  tenantId: z.string(),
  role: z.string(),
  joinedAt: z.coerce.date(),
  user: z
    .object({
      name: z.string(),
      email: z.string().email(),
    })
    .optional(),
});
export type TenantMemberResponseDTO = z.infer<typeof TenantMemberResponseSchema>;

export const ErrorResponseSchema = z.object({
  error: z.string(),
  message: z.string(),
  details: z.unknown().optional(),
});
